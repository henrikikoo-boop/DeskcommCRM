import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { ok, fail } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { fromTemplateSchema, asBlocks, asDesign, asLineItems } from "@/lib/proposals/schema";
import { mergePlaceholders, type MergeContext } from "@/lib/proposals/merge";
import { sumLineItemsCents, type ProposalBlock } from "@/lib/proposals/types";

export const dynamic = "force-dynamic";

function mergeBlocks(blocks: ProposalBlock[], ctx: MergeContext): ProposalBlock[] {
  return blocks.map((b) => ({
    ...b,
    title: b.title ? mergePlaceholders(b.title, ctx) : b.title,
    subtitle: b.subtitle ? mergePlaceholders(b.subtitle, ctx) : b.subtitle,
    body: b.body ? mergePlaceholders(b.body, ctx) : b.body,
  }));
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const authz = await requireRole("agent", { requestId });
  if (!authz.ok) return authz.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("validation_failed", "JSON inválido", 400, { requestId });
  }
  const parsed = fromTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return fail("validation_failed", "Dados inválidos", 400, {
      requestId,
      details: parsed.error.flatten(),
    });
  }

  const supabase = await createClient();
  const orgId = authz.org.orgId;

  const { data: template, error: tErr } = await supabase
    .from("crm_proposal_templates")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", parsed.data.template_id)
    .eq("is_active", true)
    .maybeSingle();
  if (tErr) return fail("internal_error", tErr.message, 500, { requestId });
  if (!template) return fail("not_found", "Modelo não encontrado ou inativo", 404, { requestId });

  const { data: lead, error: lErr } = await supabase
    .from("crm_leads")
    .select("id, title, value_cents, currency, contact_id")
    .eq("organization_id", orgId)
    .eq("id", parsed.data.lead_id)
    .maybeSingle();
  if (lErr) return fail("internal_error", lErr.message, 500, { requestId });
  if (!lead) return fail("not_found", "Oportunidade não encontrada", 404, { requestId });

  let contact: { name: string | null; email: string | null; phone: string | null } | null = null;
  let companyId: string | null = null;
  let companyName: string | null = null;
  if (lead.contact_id) {
    const { data: c } = await supabase
      .from("contacts")
      .select("id, name, display_name, email, phone_number, company_id")
      .eq("organization_id", orgId)
      .eq("id", lead.contact_id)
      .maybeSingle();
    if (c) {
      contact = {
        name: c.display_name || c.name,
        email: c.email,
        phone: c.phone_number,
      };
      companyId = c.company_id ?? null;
      if (companyId) {
        const { data: co } = await supabase
          .from("crm_companies")
          .select("name")
          .eq("organization_id", orgId)
          .eq("id", companyId)
          .maybeSingle();
        companyName = co?.name ?? null;
      }
    }
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle();

  const title =
    parsed.data.title?.trim() ||
    `Proposta — ${lead.title}`.slice(0, 200);

  const validUntil =
    parsed.data.valid_until ??
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

  const ctx: MergeContext = {
    lead: { title: lead.title, value_cents: lead.value_cents, currency: lead.currency },
    contact: contact ?? undefined,
    company: { name: companyName },
    org: { name: org?.name ?? null },
    proposal: { title, valid_until: validUntil, currency: lead.currency || "BRL" },
  };

  const blocks = mergeBlocks(asBlocks(template.blocks), ctx);
  const design = asDesign(template.design);
  const lineDefaults = asLineItems(template.default_line_items);
  const amount = sumLineItemsCents(lineDefaults) || lead.value_cents || null;
  const token = randomUUID().replace(/-/g, "");

  const { data: proposal, error: pErr } = await supabase
    .from("crm_proposals")
    .insert({
      organization_id: orgId,
      lead_id: lead.id,
      contact_id: lead.contact_id,
      company_id: companyId,
      template_id: template.id,
      title,
      status: "draft",
      currency: lead.currency || "BRL",
      amount_cents: amount,
      body_html: "",
      blocks,
      design,
      version: 1,
      valid_until: validUntil,
      public_token: token,
    })
    .select("*")
    .single();
  if (pErr) return fail("internal_error", pErr.message, 500, { requestId });

  if (lineDefaults.length > 0) {
    const rows = lineDefaults.map((it, i) => ({
      organization_id: orgId,
      proposal_id: proposal.id,
      product_id: it.product_id ?? null,
      name: it.name,
      description: it.description ?? null,
      quantity: it.quantity,
      unit_cents: it.unit_cents,
      discount_pct: it.discount_pct,
      sort_order: i,
    }));
    const { error: liErr } = await supabase.from("crm_proposal_line_items").insert(rows);
    if (liErr) return fail("internal_error", liErr.message, 500, { requestId });
  } else if (lead.value_cents && lead.value_cents > 0) {
    await supabase.from("crm_proposal_line_items").insert({
      organization_id: orgId,
      proposal_id: proposal.id,
      name: lead.title,
      quantity: 1,
      unit_cents: lead.value_cents,
      discount_pct: 0,
      sort_order: 0,
    });
  }

  void audit({
    organizationId: orgId,
    actorUserId: authz.user.id,
    action: "crm.proposal_from_template",
    resourceType: "crm_proposals",
    resourceId: proposal.id,
    requestId,
    metadata: { template_id: template.id, lead_id: lead.id },
  });

  return ok(proposal, { requestId, status: 201 });
}

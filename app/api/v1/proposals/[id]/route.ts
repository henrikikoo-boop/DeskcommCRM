import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { ok, fail } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { blockSchema, designSchema, lineItemSchema } from "@/lib/proposals/schema";
import { sumLineItemsCents } from "@/lib/proposals/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  status: z.enum(["draft", "sent"]).optional(),
  currency: z.string().length(3).optional(),
  valid_until: z.string().datetime().nullable().optional(),
  design: designSchema.optional(),
  blocks: z.array(blockSchema).max(40).optional(),
  line_items: z.array(lineItemSchema).max(100).optional(),
  body_html: z.string().max(200_000).optional(),
});

export async function GET(req: NextRequest, ctx: Ctx) {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const authz = await requireRole("viewer", { requestId });
  if (!authz.ok) return authz.response;
  const { id } = await ctx.params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_proposals")
    .select("*")
    .eq("organization_id", authz.org.orgId)
    .eq("id", id)
    .maybeSingle();
  if (error) return fail("internal_error", error.message, 500, { requestId });
  if (!data) return fail("not_found", "Proposta não encontrada", 404, { requestId });

  const { data: items } = await supabase
    .from("crm_proposal_line_items")
    .select("*")
    .eq("organization_id", authz.org.orgId)
    .eq("proposal_id", id)
    .order("sort_order", { ascending: true });

  return ok({ ...data, line_items: items ?? [] }, { requestId });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const authz = await requireRole("agent", { requestId });
  if (!authz.ok) return authz.response;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("validation_failed", "JSON inválido", 400, { requestId });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return fail("validation_failed", "Dados inválidos", 400, {
      requestId,
      details: parsed.error.flatten(),
    });
  }

  const supabase = await createClient();
  const orgId = authz.org.orgId;

  const { data: current, error: curErr } = await supabase
    .from("crm_proposals")
    .select("id, status, version")
    .eq("organization_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (curErr) return fail("internal_error", curErr.message, 500, { requestId });
  if (!current) return fail("not_found", "Proposta não encontrada", 404, { requestId });
  if (current.status === "accepted" || current.status === "rejected") {
    return fail("state_conflict", "Proposta já decidida", 409, { requestId });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.currency !== undefined) patch.currency = parsed.data.currency;
  if (parsed.data.valid_until !== undefined) patch.valid_until = parsed.data.valid_until;
  if (parsed.data.design !== undefined) patch.design = parsed.data.design;
  if (parsed.data.blocks !== undefined) patch.blocks = parsed.data.blocks;
  if (parsed.data.body_html !== undefined) patch.body_html = parsed.data.body_html;

  if (parsed.data.line_items !== undefined) {
    const amount = sumLineItemsCents(parsed.data.line_items);
    patch.amount_cents = amount;
    await supabase.from("crm_proposal_line_items").delete().eq("proposal_id", id).eq("organization_id", orgId);
    if (parsed.data.line_items.length > 0) {
      const rows = parsed.data.line_items.map((it, i) => ({
        organization_id: orgId,
        proposal_id: id,
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
    }
  }

  if (parsed.data.status === "sent" && current.status === "draft") {
    patch.status = "sent";
    patch.sent_at = new Date().toISOString();
    patch.version = (current.version ?? 1) + 0;
  } else if (parsed.data.status === "draft") {
    patch.status = "draft";
  }

  // bump version on content edits after send
  if (current.status !== "draft" && (parsed.data.blocks || parsed.data.line_items || parsed.data.design)) {
    patch.version = (current.version ?? 1) + 1;
    patch.status = "sent";
    patch.sent_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("crm_proposals")
    .update(patch)
    .eq("organization_id", orgId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return fail("internal_error", error.message, 500, { requestId });

  const { data: items } = await supabase
    .from("crm_proposal_line_items")
    .select("*")
    .eq("proposal_id", id)
    .order("sort_order", { ascending: true });

  void audit({
    organizationId: orgId,
    actorUserId: authz.user.id,
    action: "crm.proposal_updated",
    resourceType: "crm_proposals",
    resourceId: id,
    requestId,
  });

  return ok({ ...data, line_items: items ?? [] }, { requestId });
}

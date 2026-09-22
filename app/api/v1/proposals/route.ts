import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { ok, fail } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body_html: z.string().max(200_000).optional().default(""),
  amount_cents: z.number().int().nonnegative().optional().nullable(),
  currency: z.string().length(3).optional().default("BRL"),
  contact_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  lead_id: z.string().uuid().optional().nullable(),
  status: z.enum(["draft", "sent"]).optional().default("draft"),
});

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const authz = await requireRole("viewer", { requestId });
  if (!authz.ok) return authz.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_proposals")
    .select(
      "id, title, status, currency, amount_cents, public_token, contact_id, company_id, lead_id, created_at, updated_at, sent_at",
    )
    .eq("organization_id", authz.org.orgId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return fail("internal_error", error.message, 500, { requestId });
  return ok(data ?? [], { requestId });
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return fail("validation_failed", "Dados inválidos", 400, {
      requestId,
      details: parsed.error.flatten(),
    });
  }

  const token = randomUUID().replace(/-/g, "");
  const supabase = await createClient();
  const row = {
    organization_id: authz.org.orgId,
    title: parsed.data.title,
    body_html: parsed.data.body_html,
    amount_cents: parsed.data.amount_cents ?? null,
    currency: parsed.data.currency,
    contact_id: parsed.data.contact_id ?? null,
    company_id: parsed.data.company_id ?? null,
    lead_id: parsed.data.lead_id ?? null,
    status: parsed.data.status,
    public_token: token,
    sent_at: parsed.data.status === "sent" ? new Date().toISOString() : null,
  };
  const { data, error } = await supabase.from("crm_proposals").insert(row).select("*").single();
  if (error) return fail("internal_error", error.message, 500, { requestId });

  void audit({
    organizationId: authz.org.orgId,
    actorUserId: authz.user.id,
    action: "crm.proposal_created",
    resourceType: "crm_proposals",
    resourceId: data.id,
    requestId,
  });

  return ok(data, { requestId, status: 201 });
}

/** Public GET/PATCH by token — also mounted under /api/v1/public/proposals/[token] */
export async function getProposalByToken(token: string, requestId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("crm_proposals")
    .select(
      "id, organization_id, title, status, currency, amount_cents, body_html, public_token, viewed_at, decided_at",
    )
    .eq("public_token", token)
    .maybeSingle();
  if (error) return fail("internal_error", error.message, 500, { requestId });
  if (!data) return fail("not_found", "Proposta não encontrada", 404, { requestId });

  if (data.status === "sent") {
    await admin
      .from("crm_proposals")
      .update({ status: "viewed", viewed_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("organization_id", data.organization_id);
    data.status = "viewed";
  }

  return ok(
    {
      title: data.title,
      status: data.status,
      currency: data.currency,
      amount_cents: data.amount_cents,
      body_html: data.body_html,
      public_token: data.public_token,
    },
    { requestId },
  );
}

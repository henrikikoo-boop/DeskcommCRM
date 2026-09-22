import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { ok, fail } from "@/lib/api/wrappers";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { getProposalByToken } from "@/app/api/v1/proposals/route";

export const dynamic = "force-dynamic";

const decideSchema = z.object({
  decision: z.enum(["accepted", "rejected"]),
});

type Ctx = { params: Promise<{ token: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const { token } = await ctx.params;
  if (!token || token.length < 8) {
    return fail("validation_error", "Token inválido", 400, { requestId });
  }
  return getProposalByToken(token, requestId);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const { token } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("validation_error", "JSON inválido", 400, { requestId });
  }
  const parsed = decideSchema.safeParse(body);
  if (!parsed.success) {
    return fail("validation_error", "Decisão inválida", 400, { requestId });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("crm_proposals")
    .select("id, organization_id, status")
    .eq("public_token", token)
    .maybeSingle();
  if (error) return fail("internal_error", error.message, 500, { requestId });
  if (!data) return fail("not_found", "Proposta não encontrada", 404, { requestId });
  if (data.status === "accepted" || data.status === "rejected") {
    return fail("conflict", "Proposta já decidida", 409, { requestId });
  }

  const { data: updated, error: updErr } = await admin
    .from("crm_proposals")
    .update({
      status: parsed.data.decision,
      decided_at: new Date().toISOString(),
    })
    .eq("id", data.id)
    .eq("organization_id", data.organization_id)
    .select("status, decided_at")
    .single();
  if (updErr) return fail("internal_error", updErr.message, 500, { requestId });

  void audit({
    organizationId: data.organization_id,
    action: "crm.proposal_decided",
    resourceType: "crm_proposals",
    resourceId: data.id,
    requestId,
    metadata: { decision: parsed.data.decision },
  });

  return ok(updated, { requestId });
}

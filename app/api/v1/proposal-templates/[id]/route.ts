import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { ok, fail } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { templateUpdateSchema } from "@/lib/proposals/schema";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const authz = await requireRole("viewer", { requestId });
  if (!authz.ok) return authz.response;
  const { id } = await ctx.params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_proposal_templates")
    .select("*")
    .eq("organization_id", authz.org.orgId)
    .eq("id", id)
    .maybeSingle();
  if (error) return fail("internal_error", error.message, 500, { requestId });
  if (!data) return fail("not_found", "Modelo não encontrado", 404, { requestId });
  return ok(data, { requestId });
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
  const parsed = templateUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail("validation_failed", "Dados inválidos", 400, {
      requestId,
      details: parsed.error.flatten(),
    });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) patch[k] = v;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_proposal_templates")
    .update(patch)
    .eq("organization_id", authz.org.orgId)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return fail("internal_error", error.message, 500, { requestId });
  if (!data) return fail("not_found", "Modelo não encontrado", 404, { requestId });

  void audit({
    organizationId: authz.org.orgId,
    actorUserId: authz.user.id,
    action: "crm.proposal_template_updated",
    resourceType: "crm_proposal_templates",
    resourceId: id,
    requestId,
  });

  return ok(data, { requestId });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const authz = await requireRole("manager", { requestId });
  if (!authz.ok) return authz.response;
  const { id } = await ctx.params;

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_proposal_templates")
    .delete()
    .eq("organization_id", authz.org.orgId)
    .eq("id", id);
  if (error) return fail("internal_error", error.message, 500, { requestId });

  void audit({
    organizationId: authz.org.orgId,
    actorUserId: authz.user.id,
    action: "crm.proposal_template_deleted",
    resourceType: "crm_proposal_templates",
    resourceId: id,
    requestId,
  });

  return ok({ id }, { requestId });
}

import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { ok, fail } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { defaultBlocks, DEFAULT_DESIGN } from "@/lib/proposals/types";
import { templateCreateSchema } from "@/lib/proposals/schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const authz = await requireRole("viewer", { requestId });
  if (!authz.ok) return authz.response;

  const activeOnly = req.nextUrl.searchParams.get("active") === "1";
  const supabase = await createClient();
  let q = supabase
    .from("crm_proposal_templates")
    .select(
      "id, name, description, is_active, design, blocks, default_line_items, created_at, updated_at",
    )
    .eq("organization_id", authz.org.orgId)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (activeOnly) q = q.eq("is_active", true);

  const { data, error } = await q;
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
  const parsed = templateCreateSchema.safeParse(body);
  if (!parsed.success) {
    return fail("validation_failed", "Dados inválidos", 400, {
      requestId,
      details: parsed.error.flatten(),
    });
  }

  const supabase = await createClient();
  const row = {
    organization_id: authz.org.orgId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    is_active: parsed.data.is_active ?? true,
    design: parsed.data.design ?? DEFAULT_DESIGN,
    blocks: parsed.data.blocks ?? defaultBlocks(),
    default_line_items: parsed.data.default_line_items ?? [],
    created_by: authz.user.id,
  };

  const { data, error } = await supabase
    .from("crm_proposal_templates")
    .insert(row)
    .select("*")
    .single();
  if (error) return fail("internal_error", error.message, 500, { requestId });

  void audit({
    organizationId: authz.org.orgId,
    actorUserId: authz.user.id,
    action: "crm.proposal_template_created",
    resourceType: "crm_proposal_templates",
    resourceId: data.id,
    requestId,
  });

  return ok(data, { requestId, status: 201 });
}

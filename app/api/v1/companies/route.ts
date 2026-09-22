import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { ok, fail } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  document: z.string().trim().max(40).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  website: z.string().trim().url().optional().nullable().or(z.literal("")),
  notes: z.string().trim().max(4000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const authz = await requireRole("viewer", { requestId });
  if (!authz.ok) return authz.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_companies")
    .select("id, name, document, phone, email, website, notes, created_at, updated_at")
    .eq("organization_id", authz.org.orgId)
    .order("name", { ascending: true })
    .limit(200);

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
    return fail("validation_error", "JSON inválido", 400, { requestId });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return fail("validation_error", "Dados inválidos", 400, {
      requestId,
      details: parsed.error.flatten(),
    });
  }

  const supabase = await createClient();
  const row = {
    organization_id: authz.org.orgId,
    name: parsed.data.name,
    document: parsed.data.document || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    website: parsed.data.website || null,
    notes: parsed.data.notes || null,
  };
  const { data, error } = await supabase.from("crm_companies").insert(row).select("*").single();
  if (error) return fail("internal_error", error.message, 500, { requestId });

  void audit({
    organizationId: authz.org.orgId,
    actorUserId: authz.user.id,
    action: "crm.company_created",
    resourceType: "crm_companies",
    resourceId: data.id,
    requestId,
  });

  return ok(data, { requestId, status: 201 });
}

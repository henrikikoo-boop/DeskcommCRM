import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { ok, fail } from "@/lib/api/wrappers";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  requester_name: z.string().trim().min(1).max(200),
  requester_email: z.string().trim().email().optional().nullable().or(z.literal("")),
  requester_phone: z.string().trim().max(40).optional().nullable(),
  preferred_at: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

type Ctx = { params: Promise<{ token: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const { token } = await ctx.params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("crm_booking_links")
    .select("id, title, active, settings")
    .eq("public_token", token)
    .eq("active", true)
    .maybeSingle();
  if (error) return fail("internal_error", error.message, 500, { requestId });
  if (!data) return fail("not_found", "Link de agendamento não encontrado", 404, { requestId });
  return ok({ title: data.title, settings: data.settings }, { requestId });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const { token } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("validation_failed", "JSON inválido", 400, { requestId });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return fail("validation_failed", "Dados inválidos", 400, { requestId });
  }

  const admin = createAdminClient();
  const { data: link, error } = await admin
    .from("crm_booking_links")
    .select("id, organization_id, active")
    .eq("public_token", token)
    .maybeSingle();
  if (error) return fail("internal_error", error.message, 500, { requestId });
  if (!link || !link.active) {
    return fail("not_found", "Link de agendamento não encontrado", 404, { requestId });
  }

  const { data: row, error: insErr } = await admin
    .from("crm_booking_requests")
    .insert({
      organization_id: link.organization_id,
      booking_link_id: link.id,
      requester_name: parsed.data.requester_name,
      requester_email: parsed.data.requester_email || null,
      requester_phone: parsed.data.requester_phone || null,
      preferred_at: parsed.data.preferred_at || null,
      notes: parsed.data.notes || null,
    })
    .select("id, status, created_at")
    .single();
  if (insErr) return fail("internal_error", insErr.message, 500, { requestId });

  void audit({
    organizationId: link.organization_id,
    action: "crm.booking_request_created",
    resourceType: "crm_booking_requests",
    resourceId: row.id,
    requestId,
  });

  return ok(row, { requestId, status: 201 });
}

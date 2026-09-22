import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { ok, fail } from "@/lib/api/wrappers";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  session_token: z.string().min(8).max(128),
  body: z.string().trim().min(1).max(4000),
});

type Ctx = { params: Promise<{ token: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const { token } = await ctx.params;
  const session = req.nextUrl.searchParams.get("session_token");
  const admin = createAdminClient();
  const { data: widget, error } = await admin
    .from("crm_webchat_widgets")
    .select("id, organization_id, name, welcome_message, active")
    .eq("public_token", token)
    .eq("active", true)
    .maybeSingle();
  if (error) return fail("internal_error", error.message, 500, { requestId });
  if (!widget) return fail("not_found", "Widget não encontrado", 404, { requestId });

  let messages: unknown[] = [];
  if (session) {
    const { data: msgs } = await admin
      .from("crm_webchat_messages")
      .select("id, direction, body, created_at")
      .eq("organization_id", widget.organization_id)
      .eq("widget_id", widget.id)
      .eq("session_token", session)
      .order("created_at", { ascending: true })
      .limit(100);
    messages = msgs ?? [];
  }

  return ok(
    {
      name: widget.name,
      welcome_message: widget.welcome_message,
      messages,
    },
    { requestId },
  );
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const { token } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("validation_error", "JSON inválido", 400, { requestId });
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return fail("validation_error", "Dados inválidos", 400, { requestId });
  }

  const admin = createAdminClient();
  const { data: widget, error } = await admin
    .from("crm_webchat_widgets")
    .select("id, organization_id, active")
    .eq("public_token", token)
    .maybeSingle();
  if (error) return fail("internal_error", error.message, 500, { requestId });
  if (!widget || !widget.active) {
    return fail("not_found", "Widget não encontrado", 404, { requestId });
  }

  const { data: row, error: insErr } = await admin
    .from("crm_webchat_messages")
    .insert({
      organization_id: widget.organization_id,
      widget_id: widget.id,
      session_token: parsed.data.session_token,
      direction: "inbound",
      body: parsed.data.body,
    })
    .select("id, direction, body, created_at")
    .single();
  if (insErr) return fail("internal_error", insErr.message, 500, { requestId });

  void audit({
    organizationId: widget.organization_id,
    action: "crm.webchat_message_inbound",
    resourceType: "crm_webchat_messages",
    resourceId: row.id,
    requestId,
  });

  return ok(row, { requestId, status: 201 });
}

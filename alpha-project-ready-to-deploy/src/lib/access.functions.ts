import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ATTEMPT_WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

/** Activate an access code for the current user (30 days). */
export const activateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ code: z.string().trim().min(4).max(64) }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const rawCode = data.code.trim().toUpperCase();

    // Rate limit
    const since = new Date(Date.now() - ATTEMPT_WINDOW_MS).toISOString();
    const { count } = await supabase
      .from("code_activation_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("attempted_at", since);
    if ((count ?? 0) >= MAX_ATTEMPTS) {
      throw new Error("rate_limited");
    }

    // Load code with service role (need to bypass RLS to read unused codes)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: codeRow } = await supabaseAdmin
      .from("access_codes")
      .select("*")
      .eq("code", rawCode)
      .maybeSingle();

    const log = (success: boolean) =>
      supabase.from("code_activation_attempts").insert({ user_id: userId, success });

    if (!codeRow || !codeRow.is_active || codeRow.activated_by) {
      await log(false);
      throw new Error("invalid_code");
    }

    const durationDays = codeRow.duration_days ?? 30;
    const activatedAt = new Date();
    const expiresAt = new Date(activatedAt.getTime() + durationDays * 86400_000);

    // Mark code + create student_access atomically (best effort)
    const { error: uErr } = await supabaseAdmin
      .from("access_codes")
      .update({
        activated_by: userId,
        activated_at: activatedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: false,
      })
      .eq("id", codeRow.id)
      .is("activated_by", null);
    if (uErr) { await log(false); throw new Error("invalid_code"); }

    await supabaseAdmin.from("student_access").insert({
      student_id: userId,
      department_id: codeRow.department_id,
      code_id: codeRow.id,
      activated_at: activatedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    });

    await log(true);
    return { departmentId: codeRow.department_id, expiresAt: expiresAt.toISOString() };
  });

/** Promote the current user to super admin — only if no super_admin exists yet. */
export const claimSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");
    if ((count ?? 0) > 0) throw new Error("already_claimed");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "super_admin" });
    if (error) throw error;
    return { ok: true };
  });

function randomCode(len = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

/** Bulk-generate access codes for a department. Super-admin only. */
export const generateCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      departmentId: z.string().uuid(),
      quantity: z.number().int().min(1).max(5000),
      durationDays: z.number().int().min(1).max(365).default(30),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isSuper } = await supabaseAdmin.rpc("has_role", {
      _user_id: context.userId, _role: "super_admin",
    });
    if (!isSuper) throw new Error("forbidden");

    const rows = Array.from({ length: data.quantity }, () => ({
      code: randomCode(10),
      department_id: data.departmentId,
      duration_days: data.durationDays,
      created_by: context.userId,
    }));

    // Insert in batches to avoid payload limits
    const batchSize = 500;
    const inserted: { code: string }[] = [];
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { data: got, error } = await supabaseAdmin
        .from("access_codes")
        .insert(batch)
        .select("code");
      if (error) throw error;
      if (got) inserted.push(...got);
    }
    return { count: inserted.length, codes: inserted.map((r) => r.code) };
  });

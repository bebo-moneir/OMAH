import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertSuperAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "super_admin",
  });
  if (!data) throw new Error("forbidden");
  return supabaseAdmin;
}

/** List all users with their roles and access — super-admin only. */
export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ search: z.string().trim().max(120).optional() }).parse(data ?? {})
  )
  .handler(async ({ data, context }) => {
    const admin = await assertSuperAdmin(context.userId);

    let profilesQ = admin.from("profiles").select("id, full_name, email, created_at").order("created_at", { ascending: false }).limit(500);
    if (data.search) {
      const s = data.search.replace(/[%_]/g, "");
      profilesQ = profilesQ.or(`email.ilike.%${s}%,full_name.ilike.%${s}%`);
    }
    const { data: profiles, error: pErr } = await profilesQ;
    if (pErr) throw pErr;

    const ids = (profiles ?? []).map((p) => p.id);
    if (!ids.length) return { users: [] };

    const [rolesRes, accessRes, deptRes] = await Promise.all([
      admin.from("user_roles").select("id, user_id, role, department_id").in("user_id", ids),
      admin.from("student_access").select("id, student_id, department_id, expires_at, revoked, activated_at").in("student_id", ids),
      admin.from("departments").select("id, slug, name_en, name_ar"),
    ]);

    const depts = deptRes.data ?? [];
    const roles = rolesRes.data ?? [];
    const access = accessRes.data ?? [];
    const deptMap = new Map(depts.map((d) => [d.id, d]));

    const users = (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      created_at: p.created_at,
      roles: roles.filter((r) => r.user_id === p.id).map((r) => ({
        id: r.id,
        role: r.role,
        department_id: r.department_id,
        department: r.department_id ? deptMap.get(r.department_id) ?? null : null,
      })),
      accesses: access.filter((a) => a.student_id === p.id).map((a) => ({
        id: a.id,
        department_id: a.department_id,
        department: deptMap.get(a.department_id) ?? null,
        expires_at: a.expires_at,
        revoked: a.revoked,
        activated_at: a.activated_at,
      })),
    }));
    return { users };
  });

/** Promote a user to admin scoped to a specific department. Super-admin only. */
export const promoteToAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      userId: z.string().uuid(),
      departmentId: z.string().uuid(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const admin = await assertSuperAdmin(context.userId);
    const { error } = await admin
      .from("user_roles")
      .insert({ user_id: data.userId, role: "admin", department_id: data.departmentId });
    if (error && !error.message.includes("duplicate")) throw error;
    return { ok: true };
  });

/** Remove an admin role assignment. Super-admin only. */
export const removeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ roleId: z.string().uuid() }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const admin = await assertSuperAdmin(context.userId);
    // Never allow removing super_admin via this endpoint
    const { data: row } = await admin.from("user_roles").select("role").eq("id", data.roleId).maybeSingle();
    if (!row) throw new Error("not_found");
    if (row.role === "super_admin") throw new Error("forbidden");
    const { error } = await admin.from("user_roles").delete().eq("id", data.roleId);
    if (error) throw error;
    return { ok: true };
  });

/** Revoke a student's department access. Super-admin only. */
export const revokeAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ accessId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const admin = await assertSuperAdmin(context.userId);
    const { error } = await admin.from("student_access").update({ revoked: true }).eq("id", data.accessId);
    if (error) throw error;
    return { ok: true };
  });

/** Extend a student's department access by N days. Super-admin only. */
export const extendAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      accessId: z.string().uuid(),
      days: z.number().int().min(1).max(365),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const admin = await assertSuperAdmin(context.userId);
    const { data: row } = await admin.from("student_access").select("expires_at").eq("id", data.accessId).maybeSingle();
    if (!row) throw new Error("not_found");
    const base = new Date(row.expires_at);
    const from = base.getTime() > Date.now() ? base : new Date();
    const newExpires = new Date(from.getTime() + data.days * 86400_000);
    const { error } = await admin
      .from("student_access")
      .update({ expires_at: newExpires.toISOString(), revoked: false })
      .eq("id", data.accessId);
    if (error) throw error;
    return { ok: true, expires_at: newExpires.toISOString() };
  });

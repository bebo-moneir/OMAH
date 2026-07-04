import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertSuper(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  if (!data) throw new Error("forbidden");
  return supabaseAdmin;
}

const subjectInput = z.object({
  id: z.string().uuid().optional(),
  departmentId: z.string().uuid(),
  name_en: z.string().trim().min(1).max(200),
  name_ar: z.string().trim().min(1).max(200),
  description_en: z.string().trim().max(2000).optional().nullable().transform((v) => v || null),
  description_ar: z.string().trim().max(2000).optional().nullable().transform((v) => v || null),
  order_index: z.number().int().min(0).max(9999).optional(),
});

export const upsertSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => subjectInput.parse(data))
  .handler(async ({ data, context }) => {
    const admin = await assertSuper(context.userId);
    const row = {
      department_id: data.departmentId,
      name_en: data.name_en,
      name_ar: data.name_ar,
      description_en: data.description_en,
      description_ar: data.description_ar,
    };
    if (data.id) {
      const { error } = await admin.from("subjects").update(row).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: last } = await admin
      .from("subjects").select("order_index").eq("department_id", data.departmentId)
      .order("order_index", { ascending: false }).limit(1).maybeSingle();
    const next = (last?.order_index ?? -1) + 1;
    const { data: ins, error } = await admin
      .from("subjects")
      .insert({ ...row, order_index: data.order_index ?? next, created_by: context.userId })
      .select("id").maybeSingle();
    if (error) throw error;
    return { id: ins?.id };
  });

export const deleteSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const admin = await assertSuper(context.userId);
    const { error } = await admin.from("subjects").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

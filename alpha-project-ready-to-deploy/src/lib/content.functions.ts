import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Verify the caller may manage content for the given subject (admin of that dept, or super_admin). */
async function assertSubjectAccess(supabase: SupabaseClient, userId: string, subjectId: string): Promise<string> {
  const { data: subject, error } = await supabase
    .from("subjects")
    .select("department_id")
    .eq("id", subjectId)
    .maybeSingle();
  if (error || !subject) throw new Error("subject_not_found");
  const [isSuper, isAdmin] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
    supabase.rpc("is_admin_of_department", { _user_id: userId, _department_id: subject.department_id }),
  ]);
  if (!isSuper.data && !isAdmin.data) throw new Error("forbidden");
  return subject.department_id as string;
}

const bilingualString = (max = 300) => z.string().trim().min(1).max(max);
const optionalText = (max = 20_000) => z.string().trim().max(max).optional().nullable().transform((v) => v || null);
const optionalUrl = z.string().trim().url().max(2048).optional().nullable().or(z.literal("")).transform((v) => (v ? v : null));

/* ============================== LECTURES ============================== */

const lectureInput = z.object({
  id: z.string().uuid().optional(),
  subjectId: z.string().uuid(),
  title_en: bilingualString(),
  title_ar: bilingualString(),
  description_en: optionalText(),
  description_ar: optionalText(),
  video_url: optionalUrl,
  order_index: z.number().int().min(0).max(9999).optional(),
});

export const upsertLecture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => lectureInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertSubjectAccess(context.supabase, context.userId, data.subjectId);
    const row = {
      subject_id: data.subjectId,
      title_en: data.title_en,
      title_ar: data.title_ar,
      description_en: data.description_en,
      description_ar: data.description_ar,
      video_url: data.video_url,
      uploaded_by: context.userId,
      ...(data.order_index !== undefined ? { order_index: data.order_index } : {}),
    };
    if (data.id) {
      const { error } = await context.supabase.from("lectures").update(row).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    // Next order_index
    const { data: last } = await context.supabase
      .from("lectures").select("order_index").eq("subject_id", data.subjectId)
      .order("order_index", { ascending: false }).limit(1).maybeSingle();
    const next = (last?.order_index ?? -1) + 1;
    const { data: ins, error } = await context.supabase
      .from("lectures").insert({ ...row, order_index: row.order_index ?? next }).select("id").maybeSingle();
    if (error) throw error;
    return { id: ins?.id };
  });

export const deleteLecture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: lec } = await context.supabase.from("lectures").select("subject_id").eq("id", data.id).maybeSingle();
    if (!lec) throw new Error("not_found");
    await assertSubjectAccess(context.supabase, context.userId, lec.subject_id);
    const { error } = await context.supabase.from("lectures").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const reorderLectures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      subjectId: z.string().uuid(),
      orderedIds: z.array(z.string().uuid()).max(500),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    await assertSubjectAccess(context.supabase, context.userId, data.subjectId);
    // Update sequentially; small N in practice.
    for (let i = 0; i < data.orderedIds.length; i++) {
      await context.supabase.from("lectures").update({ order_index: i }).eq("id", data.orderedIds[i]).eq("subject_id", data.subjectId);
    }
    return { ok: true };
  });

/* ============================== SECTIONS ============================== */

const sectionInput = z.object({
  id: z.string().uuid().optional(),
  subjectId: z.string().uuid(),
  title_en: bilingualString(),
  title_ar: bilingualString(),
  content_en: optionalText(),
  content_ar: optionalText(),
  content_url: optionalUrl,
  order_index: z.number().int().min(0).max(9999).optional(),
});

export const upsertSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => sectionInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertSubjectAccess(context.supabase, context.userId, data.subjectId);
    const row = {
      subject_id: data.subjectId,
      title_en: data.title_en,
      title_ar: data.title_ar,
      content_en: data.content_en,
      content_ar: data.content_ar,
      content_url: data.content_url,
      uploaded_by: context.userId,
      ...(data.order_index !== undefined ? { order_index: data.order_index } : {}),
    };
    if (data.id) {
      const { error } = await context.supabase.from("sections").update(row).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: last } = await context.supabase
      .from("sections").select("order_index").eq("subject_id", data.subjectId)
      .order("order_index", { ascending: false }).limit(1).maybeSingle();
    const next = (last?.order_index ?? -1) + 1;
    const { data: ins, error } = await context.supabase
      .from("sections").insert({ ...row, order_index: row.order_index ?? next }).select("id").maybeSingle();
    if (error) throw error;
    return { id: ins?.id };
  });

export const deleteSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: sec } = await context.supabase.from("sections").select("subject_id").eq("id", data.id).maybeSingle();
    if (!sec) throw new Error("not_found");
    await assertSubjectAccess(context.supabase, context.userId, sec.subject_id);
    const { error } = await context.supabase.from("sections").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const reorderSections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      subjectId: z.string().uuid(),
      orderedIds: z.array(z.string().uuid()).max(500),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    await assertSubjectAccess(context.supabase, context.userId, data.subjectId);
    for (let i = 0; i < data.orderedIds.length; i++) {
      await context.supabase.from("sections").update({ order_index: i }).eq("id", data.orderedIds[i]).eq("subject_id", data.subjectId);
    }
    return { ok: true };
  });

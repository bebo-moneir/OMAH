import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  upsertLecture, deleteLecture, reorderLectures,
  upsertSection, deleteSection, reorderSections,
} from "@/lib/content.functions";
import { toast } from "sonner";
import { useAuth, useLang } from "@/lib/providers";
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, Video, FileText, ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminPanel });

type Lecture = {
  id: string; subject_id: string;
  title_en: string; title_ar: string;
  description_en: string | null; description_ar: string | null;
  video_url: string | null; order_index: number;
};
type Section = {
  id: string; subject_id: string;
  title_en: string; title_ar: string;
  content_en: string | null; content_ar: string | null;
  content_url: string | null; order_index: number;
};

function AdminPanel() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lang } = useLang();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const { data: scope } = useQuery({
    queryKey: ["admin-scope", user?.id],
    queryFn: async () => {
      const { data: rolesRaw } = await supabase.from("user_roles").select("role, department_id").eq("user_id", user!.id);
      const roles = rolesRaw ?? [];
      const isSuper = roles.some((r) => r.role === "super_admin");
      const deptIds = isSuper ? null : roles.filter((r) => r.role === "admin" && r.department_id).map((r) => r.department_id as string);
      let deptsQ = supabase.from("departments").select("*").order("order_index");
      if (deptIds) deptsQ = deptsQ.in("id", deptIds.length ? deptIds : ["00000000-0000-0000-0000-000000000000"]);
      const { data: departments } = await deptsQ;
      const dList = departments ?? [];
      let subjectsQ = supabase.from("subjects").select("*").order("order_index");
      if (!isSuper) subjectsQ = subjectsQ.in("department_id", dList.map((d) => d.id).length ? dList.map((d) => d.id) : ["00000000-0000-0000-0000-000000000000"]);
      const { data: subjects } = await subjectsQ;
      return { isSuper, departments: dList, subjects: subjects ?? [] };
    },
    enabled: !!user,
  });

  const activeSubject = useMemo(() => scope?.subjects.find((s) => s.id === selectedSubject), [scope, selectedSubject]);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← {t("common.dashboard")}</Link>
        <h1 className="mt-4 text-3xl sm:text-4xl font-bold font-display">{t("admin.panel")}</h1>
        <p className="mt-2 text-muted-foreground">Manage lectures and sections for your assigned {scope?.isSuper ? "departments" : "department"}.</p>

        {!scope ? null : scope.subjects.length === 0 ? (
          <p className="mt-8 text-muted-foreground">You are not assigned to any department yet. Ask a super admin to assign you.</p>
        ) : !selectedSubject ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {scope.subjects.map((s) => {
              const dept = scope.departments.find((d) => d.id === s.department_id);
              return (
                <button key={s.id} onClick={() => setSelectedSubject(s.id)}
                  className="glass-strong rounded-2xl p-5 hover:-translate-y-0.5 transition-transform text-start">
                  <div className="text-xs text-muted-foreground">{dept ? (lang === "ar" ? dept.name_ar : dept.name_en) : ""}</div>
                  <h3 className="font-semibold mt-1">{lang === "ar" ? s.name_ar : s.name_en}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{lang === "ar" ? s.description_ar : s.description_en}</p>
                </button>
              );
            })}
          </div>
        ) : (
          <SubjectEditor
            subjectId={selectedSubject}
            subjectName={activeSubject ? (lang === "ar" ? activeSubject.name_ar : activeSubject.name_en) : ""}
            onBack={() => setSelectedSubject(null)}
            lang={lang}
          />
        )}
      </main>
    </>
  );
}

function SubjectEditor({
  subjectId, subjectName, onBack, lang,
}: {
  subjectId: string; subjectName: string; onBack: () => void; lang: string;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const upLec = useServerFn(upsertLecture);
  const delLec = useServerFn(deleteLecture);
  const orderLec = useServerFn(reorderLectures);
  const upSec = useServerFn(upsertSection);
  const delSec = useServerFn(deleteSection);
  const orderSec = useServerFn(reorderSections);

  const { data: lectures } = useQuery({
    queryKey: ["admin-lectures", subjectId],
    queryFn: async () => ((await supabase.from("lectures").select("*").eq("subject_id", subjectId).order("order_index")).data ?? []) as Lecture[],
  });
  const { data: sections } = useQuery({
    queryKey: ["admin-sections", subjectId],
    queryFn: async () => ((await supabase.from("sections").select("*").eq("subject_id", subjectId).order("order_index")).data ?? []) as Section[],
  });

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ["admin-lectures", subjectId] });
    qc.invalidateQueries({ queryKey: ["admin-sections", subjectId] });
  };

  async function move<T extends { id: string }>(items: T[] | undefined, id: string, dir: -1 | 1, kind: "lec" | "sec") {
    if (!items) return;
    const idx = items.findIndex((i) => i.id === id);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= items.length) return;
    const next = items.slice();
    [next[idx], next[to]] = [next[to], next[idx]];
    try {
      if (kind === "lec") await orderLec({ data: { subjectId, orderedIds: next.map((n) => n.id) } });
      else await orderSec({ data: { subjectId, orderedIds: next.map((n) => n.id) } });
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : t("common.error")); }
  }

  async function removeItem(id: string, kind: "lec" | "sec") {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    try {
      if (kind === "lec") await delLec({ data: { id } });
      else await delSec({ data: { id } });
      toast.success("Deleted");
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : t("common.error")); }
  }

  return (
    <div className="mt-6">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Back to subjects
      </button>
      <h2 className="mt-3 text-2xl font-semibold font-display">{subjectName}</h2>

      <Tabs defaultValue="lectures" className="mt-6">
        <TabsList>
          <TabsTrigger value="lectures" className="gap-1.5"><Video className="h-4 w-4" />{t("dept.lectures")}</TabsTrigger>
          <TabsTrigger value="sections" className="gap-1.5"><FileText className="h-4 w-4" />{t("dept.sections")}</TabsTrigger>
        </TabsList>

        {/* LECTURES */}
        <TabsContent value="lectures" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <LectureDialog
              trigger={<Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />New lecture</Button>}
              onSubmit={async (v) => { await upLec({ data: { ...v, subjectId } }); refetch(); }}
            />
          </div>
          {(lectures ?? []).length === 0 && <p className="text-sm text-muted-foreground">No lectures yet.</p>}
          {lectures?.map((l, i) => (
            <div key={l.id} className="glass-strong rounded-2xl p-4 flex items-start gap-3">
              <div className="flex flex-col gap-1">
                <button onClick={() => move(lectures, l.id, -1, "lec")} disabled={i === 0}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                <button onClick={() => move(lectures, l.id, 1, "lec")} disabled={i === lectures.length - 1}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">#{i + 1}</div>
                <h4 className="font-medium">{lang === "ar" ? l.title_ar : l.title_en}</h4>
                <div className="text-xs text-muted-foreground opacity-80">{lang === "ar" ? l.title_en : l.title_ar}</div>
                {l.video_url && <a href={l.video_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline mt-1 inline-block truncate max-w-full">{l.video_url}</a>}
              </div>
              <div className="flex gap-1">
                <LectureDialog
                  initial={l}
                  trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>}
                  onSubmit={async (v) => { await upLec({ data: { ...v, id: l.id, subjectId } }); refetch(); }}
                />
                <Button size="icon" variant="ghost" onClick={() => removeItem(l.id, "lec")}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* SECTIONS */}
        <TabsContent value="sections" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <SectionDialog
              trigger={<Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />New section</Button>}
              onSubmit={async (v) => { await upSec({ data: { ...v, subjectId } }); refetch(); }}
            />
          </div>
          {(sections ?? []).length === 0 && <p className="text-sm text-muted-foreground">No sections yet.</p>}
          {sections?.map((s, i) => (
            <div key={s.id} className="glass-strong rounded-2xl p-4 flex items-start gap-3">
              <div className="flex flex-col gap-1">
                <button onClick={() => move(sections, s.id, -1, "sec")} disabled={i === 0}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                <button onClick={() => move(sections, s.id, 1, "sec")} disabled={i === sections.length - 1}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">#{i + 1}</div>
                <h4 className="font-medium">{lang === "ar" ? s.title_ar : s.title_en}</h4>
                <div className="text-xs text-muted-foreground opacity-80">{lang === "ar" ? s.title_en : s.title_ar}</div>
                {s.content_url && <a href={s.content_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline mt-1 inline-block truncate max-w-full">{s.content_url}</a>}
              </div>
              <div className="flex gap-1">
                <SectionDialog
                  initial={s}
                  trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>}
                  onSubmit={async (v) => { await upSec({ data: { ...v, id: s.id, subjectId } }); refetch(); }}
                />
                <Button size="icon" variant="ghost" onClick={() => removeItem(s.id, "sec")}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ================= DIALOGS ================= */

type LectureValues = {
  title_en: string; title_ar: string;
  description_en: string; description_ar: string;
  video_url: string;
};

function LectureDialog({
  trigger, initial, onSubmit,
}: {
  trigger: React.ReactNode;
  initial?: Partial<Lecture>;
  onSubmit: (values: LectureValues) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<LectureValues>({
    title_en: initial?.title_en ?? "",
    title_ar: initial?.title_ar ?? "",
    description_en: initial?.description_en ?? "",
    description_ar: initial?.description_ar ?? "",
    video_url: initial?.video_url ?? "",
  });
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await onSubmit(v); toast.success("Saved"); setOpen(false); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    finally { setBusy(false); }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit lecture" : "New lecture"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Title (English)</Label><Input value={v.title_en} onChange={(e) => setV({ ...v, title_en: e.target.value })} required /></div>
            <div><Label>Title (العربية)</Label><Input dir="rtl" value={v.title_ar} onChange={(e) => setV({ ...v, title_ar: e.target.value })} required /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Description (English)</Label><Textarea rows={3} value={v.description_en} onChange={(e) => setV({ ...v, description_en: e.target.value })} /></div>
            <div><Label>Description (العربية)</Label><Textarea rows={3} dir="rtl" value={v.description_ar} onChange={(e) => setV({ ...v, description_ar: e.target.value })} /></div>
          </div>
          <div>
            <Label>Video URL</Label>
            <Input type="url" placeholder="https://…" value={v.video_url} onChange={(e) => setV({ ...v, video_url: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type SectionValues = {
  title_en: string; title_ar: string;
  content_en: string; content_ar: string;
  content_url: string;
};

function SectionDialog({
  trigger, initial, onSubmit,
}: {
  trigger: React.ReactNode;
  initial?: Partial<Section>;
  onSubmit: (values: SectionValues) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<SectionValues>({
    title_en: initial?.title_en ?? "",
    title_ar: initial?.title_ar ?? "",
    content_en: initial?.content_en ?? "",
    content_ar: initial?.content_ar ?? "",
    content_url: initial?.content_url ?? "",
  });
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await onSubmit(v); toast.success("Saved"); setOpen(false); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    finally { setBusy(false); }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit section" : "New section"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Title (English)</Label><Input value={v.title_en} onChange={(e) => setV({ ...v, title_en: e.target.value })} required /></div>
            <div><Label>Title (العربية)</Label><Input dir="rtl" value={v.title_ar} onChange={(e) => setV({ ...v, title_ar: e.target.value })} required /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Content (English)</Label><Textarea rows={5} value={v.content_en} onChange={(e) => setV({ ...v, content_en: e.target.value })} /></div>
            <div><Label>Content (العربية)</Label><Textarea rows={5} dir="rtl" value={v.content_ar} onChange={(e) => setV({ ...v, content_ar: e.target.value })} /></div>
          </div>
          <div>
            <Label>Attachment URL (optional)</Label>
            <Input type="url" placeholder="https://…" value={v.content_url} onChange={(e) => setV({ ...v, content_url: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

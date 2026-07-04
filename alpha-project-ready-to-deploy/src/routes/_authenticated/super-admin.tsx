import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { generateCodes } from "@/lib/access.functions";
import {
  listUsers, promoteToAdmin, removeRole, revokeAccess, extendAccess,
} from "@/lib/admin.functions";
import { upsertSubject, deleteSubject } from "@/lib/subjects.functions";
import { toast } from "sonner";
import { useLang } from "@/lib/providers";
import { Download, KeyRound, Search, ShieldPlus, X, Ban, Plus, Users, BookOpen, Pencil, Trash2, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_authenticated/super-admin")({ component: SuperAdmin });

function SuperAdmin() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const qc = useQueryClient();

  const gen = useServerFn(generateCodes);
  const list = useServerFn(listUsers);
  const promote = useServerFn(promoteToAdmin);
  const remove = useServerFn(removeRole);
  const revoke = useServerFn(revokeAccess);
  const extend = useServerFn(extendAccess);

  const [qty, setQty] = useState(50);
  const [deptId, setDeptId] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastCodes, setLastCodes] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "students" | "admins">("all");

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await supabase.from("departments").select("*").order("order_index")).data ?? [],
  });

  const { data: codes, refetch: refetchCodes } = useQuery({
    queryKey: ["all-codes"],
    queryFn: async () =>
      (await supabase.from("access_codes").select("*, departments(slug, name_en)").order("created_at", { ascending: false }).limit(500)).data ?? [],
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-users", userSearch],
    queryFn: async () => (await list({ data: { search: userSearch || undefined } })).users,
  });

  const filteredUsers = useMemo(() => {
    if (!usersData) return [];
    if (userFilter === "students") return usersData.filter((u) => !u.roles.some((r) => r.role !== "student"));
    if (userFilter === "admins") return usersData.filter((u) => u.roles.some((r) => r.role === "admin" || r.role === "super_admin"));
    return usersData;
  }, [usersData, userFilter]);

  async function handleGen(e: React.FormEvent) {
    e.preventDefault();
    if (!deptId) return;
    setLoading(true);
    try {
      const res = await gen({ data: { departmentId: deptId, quantity: qty, durationDays: 30 } });
      setLastCodes(res.codes);
      toast.success(`Generated ${res.count} codes`);
      refetchCodes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally { setLoading(false); }
  }

  function exportXlsx(rows: Array<Record<string, unknown>>, filename: string, sheetName = "Codes") {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
  }

  function exportAllCodes() {
    const rows = (codes ?? []).map((c) => ({
      code: c.code,
      department: c.departments?.name_en ?? "",
      status: c.activated_by ? (new Date(c.expires_at ?? 0) > new Date() ? "active" : "expired") : "unused",
      activated_at: c.activated_at ?? "",
      expires_at: c.expires_at ?? "",
    }));
    exportXlsx(rows, "alpha-codes.xlsx");
  }

  function exportLastCodes() {
    const dept = departments?.find((d) => d.id === deptId);
    const rows = lastCodes.map((code, i) => ({ "#": i + 1, code, department: dept?.name_en ?? "" }));
    const stamp = new Date().toISOString().slice(0, 10);
    exportXlsx(rows, `alpha-codes-${dept?.slug ?? "batch"}-${stamp}.xlsx`);
  }

  const refreshUsers = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  async function handlePromote(userId: string, departmentId: string) {
    try { await promote({ data: { userId, departmentId } }); toast.success(t("admin.promoted")); refreshUsers(); }
    catch (err) { toast.error(err instanceof Error ? err.message : t("common.error")); }
  }
  async function handleRemoveRole(roleId: string) {
    try { await remove({ data: { roleId } }); toast.success("Role removed"); refreshUsers(); }
    catch (err) { toast.error(err instanceof Error ? err.message : t("common.error")); }
  }
  async function handleRevoke(accessId: string) {
    try { await revoke({ data: { accessId } }); toast.success("Access revoked"); refreshUsers(); }
    catch (err) { toast.error(err instanceof Error ? err.message : t("common.error")); }
  }
  async function handleExtend(accessId: string, days: number) {
    try { await extend({ data: { accessId, days } }); toast.success(`Extended by ${days} days`); refreshUsers(); }
    catch (err) { toast.error(err instanceof Error ? err.message : t("common.error")); }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-8">
        <div>
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← {t("common.dashboard")}</Link>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold font-display">{t("admin.superPanel")}</h1>
        </div>

        {/* USER MANAGEMENT */}
        <section className="glass-strong rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Users className="h-5 w-5" />{t("admin.users")}</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search email or name…" className="ps-9 w-64" />
              </div>
              <select value={userFilter} onChange={(e) => setUserFilter(e.target.value as typeof userFilter)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="all">All</option>
                <option value="students">Students only</option>
                <option value="admins">Admins</option>
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-auto max-h-[520px] rounded-xl border border-border/50">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="text-left">
                  <th className="p-2.5">User</th>
                  <th className="p-2.5">Roles</th>
                  <th className="p-2.5">Access</th>
                  <th className="p-2.5 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-t border-border/40 align-top">
                    <td className="p-2.5">
                      <div className="font-medium">{u.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="p-2.5 space-y-1">
                      {u.roles.length === 0 && <span className="text-xs text-muted-foreground">student</span>}
                      {u.roles.map((r) => (
                        <div key={r.id} className="flex items-center gap-1.5">
                          <Badge variant={r.role === "super_admin" ? "default" : "secondary"} className="text-[10px]">
                            {r.role}{r.department ? ` · ${lang === "ar" ? r.department.name_ar : r.department.name_en}` : ""}
                          </Badge>
                          {r.role === "admin" && (
                            <button onClick={() => handleRemoveRole(r.id)} className="text-muted-foreground hover:text-destructive" title="Remove role">
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </td>
                    <td className="p-2.5 space-y-1.5">
                      {u.accesses.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      {u.accesses.map((a) => {
                        const expired = new Date(a.expires_at).getTime() < Date.now();
                        const status = a.revoked ? "revoked" : expired ? "expired" : "active";
                        return (
                          <div key={a.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="font-medium">{a.department ? (lang === "ar" ? a.department.name_ar : a.department.name_en) : "?"}</span>
                            <Badge variant={status === "active" ? "default" : "outline"} className="text-[10px]">{status}</Badge>
                            <span className="text-muted-foreground">until {new Date(a.expires_at).toLocaleDateString()}</span>
                            {!a.revoked && !expired && (
                              <button onClick={() => handleRevoke(a.id)} className="text-muted-foreground hover:text-destructive inline-flex items-center gap-0.5" title="Revoke">
                                <Ban className="h-3 w-3" />
                              </button>
                            )}
                            <button onClick={() => handleExtend(a.id, 30)} className="text-muted-foreground hover:text-primary inline-flex items-center gap-0.5" title="Extend 30 days">
                              <Plus className="h-3 w-3" />30d
                            </button>
                          </div>
                        );
                      })}
                    </td>
                    <td className="p-2.5 text-end">
                      <PromoteDialog departments={departments ?? []} lang={lang} onPromote={(d) => handlePromote(u.id, d)} />
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">No users match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* CODES */}
        <section className="glass-strong rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold flex items-center gap-2"><KeyRound className="h-5 w-5" />{t("admin.generate")}</h2>
          <form onSubmit={handleGen} className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <Label>{t("admin.department")}</Label>
              <select value={deptId} onChange={(e) => setDeptId(e.target.value)} required
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">—</option>
                {departments?.map((d) => (
                  <option key={d.id} value={d.id}>{lang === "ar" ? d.name_ar : d.name_en}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t("admin.quantity")}</Label>
              <Input type="number" min={1} max={5000} value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading} className="w-full h-10">{loading ? t("common.loading") : t("admin.generate")}</Button>
            </div>
          </form>
          {lastCodes.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-muted/50 p-3 max-h-32 overflow-auto font-mono text-xs">
                {lastCodes.slice(0, 20).join("  ·  ")}{lastCodes.length > 20 && ` … +${lastCodes.length - 20} more`}
              </div>
              <Button size="sm" onClick={exportLastCodes} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                {lang === "ar" ? `تنزيل ${lastCodes.length} كود كملف Excel` : `Download ${lastCodes.length} codes as Excel`}
              </Button>
            </div>
          )}
        </section>

        {/* SUBJECTS (super admin only) */}
        <SubjectsManager
          departments={departments ?? []}
          lang={lang}
        />

        <section className="glass-strong rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">{t("admin.codes")}</h2>
            <Button variant="secondary" size="sm" onClick={exportAllCodes} className="gap-2"><Download className="h-4 w-4" />{lang === "ar" ? "تصدير Excel" : "Export Excel"}</Button>
          </div>
          <div className="mt-4 overflow-auto max-h-[500px] rounded-xl border border-border/50">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="text-left">
                  <th className="p-2.5">Code</th>
                  <th className="p-2.5">{t("admin.department")}</th>
                  <th className="p-2.5">{t("admin.codeStatus")}</th>
                  <th className="p-2.5">Expires</th>
                </tr>
              </thead>
              <tbody>
                {codes?.map((c) => {
                  const status = c.activated_by ? (new Date(c.expires_at ?? 0) > new Date() ? t("dashboard.active") : t("dashboard.expired")) : t("admin.unused");
                  return (
                    <tr key={c.id} className="border-t border-border/40">
                      <td className="p-2.5 font-mono">{c.code}</td>
                      <td className="p-2.5">{c.departments?.name_en}</td>
                      <td className="p-2.5"><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{status}</span></td>
                      <td className="p-2.5 text-xs text-muted-foreground">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}

function PromoteDialog({
  departments, lang, onPromote,
}: {
  departments: Array<{ id: string; name_en: string; name_ar: string }>;
  lang: string;
  onPromote: (departmentId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dept, setDept] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <ShieldPlus className="h-3.5 w-3.5" />Promote
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote to Admin</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label>Department</Label>
          <select value={dept} onChange={(e) => setDept(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">— Select department —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{lang === "ar" ? d.name_ar : d.name_en}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            The user will be able to create and edit content only within this department.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!dept} onClick={() => { onPromote(dept); setOpen(false); setDept(""); }}>Promote</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================== SUBJECTS MANAGER ============================== */

type SubjectRow = {
  id: string; department_id: string;
  name_en: string; name_ar: string;
  description_en: string | null; description_ar: string | null;
  order_index: number;
};

function SubjectsManager({
  departments, lang,
}: {
  departments: Array<{ id: string; slug: string; name_en: string; name_ar: string }>;
  lang: string;
}) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertSubject);
  const del = useServerFn(deleteSubject);
  const [filterDept, setFilterDept] = useState<string>("all");

  const { data: subjects } = useQuery({
    queryKey: ["all-subjects"],
    queryFn: async () =>
      ((await supabase.from("subjects").select("*").order("department_id").order("order_index")).data ?? []) as SubjectRow[],
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["all-subjects"] });

  async function remove(id: string) {
    if (!confirm(lang === "ar" ? "حذف هذه المادة نهائيًا؟" : "Delete this subject permanently?")) return;
    try { await del({ data: { id } }); toast.success(lang === "ar" ? "تم الحذف" : "Deleted"); refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
  }

  const filtered = (subjects ?? []).filter((s) => filterDept === "all" || s.department_id === filterDept);

  return (
    <section className="glass-strong rounded-3xl p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          {lang === "ar" ? "المواد" : "Subjects"}
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">{lang === "ar" ? "كل الأقسام" : "All departments"}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{lang === "ar" ? d.name_ar : d.name_en}</option>
            ))}
          </select>
          <SubjectDialog
            departments={departments}
            lang={lang}
            trigger={<Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />{lang === "ar" ? "مادة جديدة" : "New subject"}</Button>}
            onSubmit={async (v) => { await upsert({ data: v }); refresh(); }}
          />
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {lang === "ar"
          ? "المشرف العام فقط يقدر يضيف أو يعدل أو يحذف المواد. الأدمن العادي يضيف المحاضرات والسكاشن داخل هذه المواد."
          : "Only super admins can add, edit, or delete subjects. Regular admins add lectures and sections inside them."}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">{lang === "ar" ? "لا توجد مواد." : "No subjects."}</p>
        )}
        {filtered.map((s) => {
          const dept = departments.find((d) => d.id === s.department_id);
          return (
            <div key={s.id} className="rounded-2xl border border-border/50 p-4 bg-background/30">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{dept ? (lang === "ar" ? dept.name_ar : dept.name_en) : "?"}</div>
              <h4 className="mt-1 font-semibold">{lang === "ar" ? s.name_ar : s.name_en}</h4>
              <div className="text-xs text-muted-foreground opacity-80">{lang === "ar" ? s.name_en : s.name_ar}</div>
              {(s.description_en || s.description_ar) && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{lang === "ar" ? s.description_ar : s.description_en}</p>
              )}
              <div className="mt-3 flex justify-end gap-1">
                <SubjectDialog
                  initial={s}
                  departments={departments}
                  lang={lang}
                  trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>}
                  onSubmit={async (v) => { await upsert({ data: { ...v, id: s.id } }); refresh(); }}
                />
                <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type SubjectValues = {
  departmentId: string;
  name_en: string; name_ar: string;
  description_en: string; description_ar: string;
};

function SubjectDialog({
  trigger, initial, departments, lang, onSubmit,
}: {
  trigger: React.ReactNode;
  initial?: Partial<SubjectRow>;
  departments: Array<{ id: string; name_en: string; name_ar: string }>;
  lang: string;
  onSubmit: (values: SubjectValues) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<SubjectValues>({
    departmentId: initial?.department_id ?? "",
    name_en: initial?.name_en ?? "",
    name_ar: initial?.name_ar ?? "",
    description_en: initial?.description_en ?? "",
    description_ar: initial?.description_ar ?? "",
  });
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!v.departmentId) return;
    setBusy(true);
    try { await onSubmit(v); toast.success(lang === "ar" ? "تم الحفظ" : "Saved"); setOpen(false); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    finally { setBusy(false); }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial?.id ? (lang === "ar" ? "تعديل مادة" : "Edit subject") : (lang === "ar" ? "مادة جديدة" : "New subject")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>{lang === "ar" ? "القسم" : "Department"}</Label>
            <select
              value={v.departmentId}
              onChange={(e) => setV({ ...v, departmentId: e.target.value })}
              required
              disabled={!!initial?.id}
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{lang === "ar" ? d.name_ar : d.name_en}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Name (English)</Label><Input value={v.name_en} onChange={(e) => setV({ ...v, name_en: e.target.value })} required /></div>
            <div><Label>الاسم (العربية)</Label><Input dir="rtl" value={v.name_ar} onChange={(e) => setV({ ...v, name_ar: e.target.value })} required /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Description (English)</Label><Textarea rows={3} value={v.description_en} onChange={(e) => setV({ ...v, description_en: e.target.value })} /></div>
            <div><Label>الوصف (العربية)</Label><Textarea rows={3} dir="rtl" value={v.description_ar} onChange={(e) => setV({ ...v, description_ar: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
            <Button type="submit" disabled={busy}>{busy ? (lang === "ar" ? "جارٍ الحفظ…" : "Saving…") : (lang === "ar" ? "حفظ" : "Save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

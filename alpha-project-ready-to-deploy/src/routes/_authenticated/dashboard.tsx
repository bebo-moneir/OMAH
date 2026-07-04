import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Leaf, Dna, KeyRound, ArrowRight, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { CountdownRing } from "@/components/CountdownRing";
import { Button } from "@/components/ui/button";
import { useAuth, useLang } from "@/lib/providers";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { claimSuperAdmin } from "@/lib/access.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { user } = useAuth();
  const claim = useServerFn(claimSuperAdmin);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: roles } = useQuery({
    queryKey: ["roles", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").order("order_index");
      return data ?? [];
    },
  });

  const { data: accesses, refetch: refetchAccess } = useQuery({
    queryKey: ["student_access", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("student_access").select("*")
        .eq("student_id", user!.id).eq("revoked", false).order("expires_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const activeAccesses = (accesses ?? []).filter((a) => new Date(a.expires_at) > new Date());
  const isSuperAdmin = roles?.some((r) => r.role === "super_admin");
  const isAdmin = roles?.some((r) => r.role === "admin");

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl sm:text-4xl font-bold font-display">
            {t("dashboard.hi")}, {profile?.full_name || user?.email?.split("@")[0]} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">{t("dashboard.welcome")}</p>
        </motion.div>

        {(isSuperAdmin || isAdmin) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {isSuperAdmin && (
              <Button asChild variant="secondary" className="gap-2"><Link to="/super-admin"><ShieldCheck className="h-4 w-4" />{t("admin.superPanel")}</Link></Button>
            )}
            {isAdmin && (
              <Button asChild variant="secondary" className="gap-2"><Link to="/admin"><ShieldCheck className="h-4 w-4" />{t("admin.panel")}</Link></Button>
            )}
          </div>
        )}

        {activeAccesses.length === 0 ? (
          <section className="mt-10 glass-strong rounded-3xl p-8 sm:p-12 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-2xl font-bold font-display">{t("dashboard.noAccessTitle")}</h2>
            <p className="mt-2 text-muted-foreground max-w-md mx-auto">{t("dashboard.noAccessBody")}</p>
            <Button asChild size="lg" className="mt-6 rounded-full gap-2 h-12 px-6">
              <Link to="/activate-code">{t("dashboard.activateCode")}<ArrowRight className="h-4 w-4 rtl-flip" /></Link>
            </Button>

            {!isSuperAdmin && (
              <div className="mt-8 pt-6 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-2">First-time setup?</p>
                <button
                  className="text-xs underline text-muted-foreground hover:text-foreground"
                  onClick={async () => {
                    try { await claim({ data: undefined }); toast.success(t("admin.promoted")); location.reload(); }
                    catch { toast.error(t("admin.onlyFirst")); }
                  }}
                >
                  {t("admin.becomeSuperAdmin")}
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-4">{t("dashboard.yourDepts")}</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {activeAccesses.map((a) => {
                const dept = departments?.find((d) => d.id === a.department_id);
                if (!dept) return null;
                const daysLeft = Math.ceil((new Date(a.expires_at).getTime() - Date.now()) / 86400_000);
                const isFS = dept.slug === "food-safety";
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                    className={`glass-strong rounded-3xl p-6 ${isFS ? "glow-fs" : "glow-bt"}`}
                  >
                    <div className="flex items-start gap-6">
                      <div className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${isFS ? "text-fs" : "text-bt"}`}
                        style={{ background: isFS ? "var(--fs-glow)" : "var(--bt-glow)" }}>
                        {isFS ? <Leaf className="h-7 w-7" /> : <Dna className="h-7 w-7" />}
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-xl font-bold font-display ${isFS ? "text-fs" : "text-bt"}`}>
                          {lang === "ar" ? dept.name_ar : dept.name_en}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {lang === "ar" ? dept.description_ar : dept.description_en}
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-xs">
                          <span className="rounded-full bg-success/15 text-success px-2 py-0.5">{t("dashboard.active")}</span>
                          <span className="text-muted-foreground">{t("dashboard.expiresIn")} {daysLeft} {daysLeft === 1 ? t("dashboard.day") : t("dashboard.days")}</span>
                        </div>
                      </div>
                      <CountdownRing daysLeft={daysLeft} size={100} />
                    </div>
                    <Button asChild className="mt-5 w-full rounded-xl h-11 gap-2">
                      <Link to="/department/$slug" params={{ slug: dept.slug }}>{t("dashboard.openDept")}<ArrowRight className="h-4 w-4 rtl-flip" /></Link>
                    </Button>
                  </motion.div>
                );
              })}
              <Link to="/activate-code" className="glass rounded-3xl p-6 flex items-center justify-center border-2 border-dashed border-border/60 hover:border-primary/60 transition min-h-[180px]">
                <div className="text-center">
                  <KeyRound className="h-6 w-6 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">{t("dashboard.activateCode")}</p>
                </div>
              </Link>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/providers";

export const Route = createFileRoute("/_authenticated/department/$slug")({ component: DepartmentPage });

function DepartmentPage() {
  const { slug } = useParams({ from: "/_authenticated/department/$slug" });
  const { t } = useTranslation();
  const { lang } = useLang();

  const { data: dept } = useQuery({
    queryKey: ["dept", slug],
    queryFn: async () => (await supabase.from("departments").select("*").eq("slug", slug).maybeSingle()).data,
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects", dept?.id],
    queryFn: async () => (await supabase.from("subjects").select("*").eq("department_id", dept!.id).order("order_index")).data ?? [],
    enabled: !!dept,
  });

  if (!dept) return <><AppHeader /><main className="p-10 text-center text-muted-foreground">{t("common.loading")}</main></>;
  const isFS = dept.slug === "food-safety";
  const tone = isFS ? "text-fs" : "text-bt";
  const glow = isFS ? "glow-fs" : "glow-bt";

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← {t("common.dashboard")}</Link>
        <div className="mt-4">
          <h1 className={`text-4xl sm:text-5xl font-bold font-display ${tone}`}>
            {lang === "ar" ? dept.name_ar : dept.name_en}
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            {lang === "ar" ? dept.description_ar : dept.description_en}
          </p>
        </div>

        <h2 className="mt-10 text-xl font-semibold">{t("dept.subjects")}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subjects?.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            >
              <Link to="/subject/$id" params={{ id: s.id }} className={`block glass rounded-2xl p-6 ${glow} hover:-translate-y-1 transition-transform`}>
                <BookOpen className={`h-6 w-6 ${tone}`} />
                <h3 className="mt-3 font-semibold text-lg">{lang === "ar" ? s.name_ar : s.name_en}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{lang === "ar" ? s.description_ar : s.description_en}</p>
                <span className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${tone}`}>
                  {t("common.continue")} <ArrowRight className="h-3 w-3 rtl-flip" />
                </span>
              </Link>
            </motion.div>
          ))}
          {subjects?.length === 0 && <p className="text-muted-foreground">{t("dept.noContent")}</p>}
        </div>
      </main>
    </>
  );
}

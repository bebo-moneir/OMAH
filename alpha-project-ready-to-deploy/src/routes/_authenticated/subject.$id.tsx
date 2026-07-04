import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PlayCircle, FileText, BookOpenCheck } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/providers";

export const Route = createFileRoute("/_authenticated/subject/$id")({ component: SubjectPage });

function SubjectPage() {
  const { id } = useParams({ from: "/_authenticated/subject/$id" });
  const { t } = useTranslation();
  const { lang } = useLang();

  const { data: subject } = useQuery({
    queryKey: ["subject", id],
    queryFn: async () => (await supabase.from("subjects").select("*, departments(*)").eq("id", id).maybeSingle()).data,
  });

  const { data: lectures } = useQuery({
    queryKey: ["lectures", id],
    queryFn: async () => (await supabase.from("lectures").select("*").eq("subject_id", id).order("order_index")).data ?? [],
  });
  const { data: sections } = useQuery({
    queryKey: ["sections", id],
    queryFn: async () => (await supabase.from("sections").select("*").eq("subject_id", id).order("order_index")).data ?? [],
  });
  const { data: summaries } = useQuery({
    queryKey: ["summaries", id],
    queryFn: async () => (await supabase.from("summaries").select("*").eq("subject_id", id).order("order_index")).data ?? [],
  });

  if (!subject) return <><AppHeader /><main className="p-10 text-center text-muted-foreground">{t("common.loading")}</main></>;
  const isFS = subject.departments?.slug === "food-safety";
  const tone = isFS ? "text-fs" : "text-bt";

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <Link to="/department/$slug" params={{ slug: subject.departments!.slug }} className="text-sm text-muted-foreground hover:text-foreground">
          ← {lang === "ar" ? subject.departments!.name_ar : subject.departments!.name_en}
        </Link>
        <h1 className={`mt-4 text-4xl font-bold font-display ${tone}`}>{lang === "ar" ? subject.name_ar : subject.name_en}</h1>
        <p className="mt-2 text-muted-foreground">{lang === "ar" ? subject.description_ar : subject.description_en}</p>

        <Tabs defaultValue="lectures" className="mt-8">
          <TabsList className="glass">
            <TabsTrigger value="lectures" className="gap-1.5"><PlayCircle className="h-4 w-4" />{t("dept.lectures")}</TabsTrigger>
            <TabsTrigger value="sections" className="gap-1.5"><BookOpenCheck className="h-4 w-4" />{t("dept.sections")}</TabsTrigger>
            <TabsTrigger value="summaries" className="gap-1.5"><FileText className="h-4 w-4" />{t("dept.summaries")}</TabsTrigger>
          </TabsList>

          <TabsContent value="lectures" className="mt-6 space-y-3">
            {lectures?.length ? lectures.map((l) => (
              <div key={l.id} className="glass rounded-2xl p-5">
                <h3 className="font-semibold">{lang === "ar" ? l.title_ar : l.title_en}</h3>
                {l.description_en && <p className="text-sm text-muted-foreground mt-1">{lang === "ar" ? l.description_ar : l.description_en}</p>}
                {l.video_url && (
                  <div className="mt-3 aspect-video rounded-xl overflow-hidden bg-black/40">
                    <iframe src={l.video_url} className="w-full h-full" title={l.title_en} allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen />
                  </div>
                )}
              </div>
            )) : <p className="text-muted-foreground text-sm">{t("dept.noContent")}</p>}
          </TabsContent>

          <TabsContent value="sections" className="mt-6 space-y-3">
            {sections?.length ? sections.map((s) => (
              <div key={s.id} className="glass rounded-2xl p-5">
                <h3 className="font-semibold">{lang === "ar" ? s.title_ar : s.title_en}</h3>
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{lang === "ar" ? s.content_ar : s.content_en}</p>
              </div>
            )) : <p className="text-muted-foreground text-sm">{t("dept.noContent")}</p>}
          </TabsContent>

          <TabsContent value="summaries" className="mt-6 space-y-3">
            {summaries?.length ? summaries.map((s) => (
              <div key={s.id} className="glass rounded-2xl p-5">
                <h3 className="font-semibold">{lang === "ar" ? s.title_ar : s.title_en}</h3>
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{lang === "ar" ? s.content_ar : s.content_en}</p>
                {s.file_url && <a href={s.file_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-primary hover:underline">{t("dept.download")} ↗</a>}
              </div>
            )) : <p className="text-muted-foreground text-sm">{t("dept.noContent")}</p>}
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}

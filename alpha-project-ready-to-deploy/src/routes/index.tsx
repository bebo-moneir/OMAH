import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowRight, Leaf, Dna, Sparkles, Languages, Clock } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  const { t } = useTranslation();

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Hero */}
        <section className="relative pt-16 pb-24 sm:pt-24 sm:pb-32 text-center">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-20 start-1/4 h-72 w-72 rounded-full bg-fs/20 blur-3xl animate-float-slow" />
            <div className="absolute bottom-10 end-1/4 h-72 w-72 rounded-full bg-bt/20 blur-3xl animate-float-slow" style={{ animationDelay: "2s" }} />
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              {t("common.tagline")}
            </span>
            <h1 className="mt-6 text-5xl sm:text-7xl font-bold font-display leading-[1.05] hero-text">
              {t("landing.hero1")}<br />
              <span className="bg-gradient-to-r from-fs to-bt bg-clip-text text-transparent">{t("landing.hero2")}</span>
            </h1>
            <p className="mt-6 mx-auto max-w-2xl text-lg text-muted-foreground">{t("landing.heroSub")}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="rounded-full h-12 px-6 text-base gap-2">
                <Link to="/auth">{t("landing.getStarted")}<ArrowRight className="h-4 w-4 rtl-flip" /></Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="rounded-full h-12 px-6 text-base">
                <Link to="/auth">{t("landing.haveAccount")}</Link>
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Departments */}
        <section className="pb-24">
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-center mb-12">{t("landing.depts")}</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <DeptCard icon={<Leaf className="h-8 w-8" />} title={t("landing.foodSafety")} desc={t("landing.fsDesc")} tone="fs" />
            <DeptCard icon={<Dna className="h-8 w-8" />} title={t("landing.biotech")} desc={t("landing.btDesc")} tone="bt" />
          </div>
        </section>

        {/* Features */}
        <section className="pb-24 grid gap-6 md:grid-cols-3">
          <Feature icon={<Languages className="h-5 w-5" />} title={t("landing.feat1Title")} body={t("landing.feat1Body")} />
          <Feature icon={<Sparkles className="h-5 w-5" />} title={t("landing.feat2Title")} body={t("landing.feat2Body")} />
          <Feature icon={<Clock className="h-5 w-5" />} title={t("landing.feat3Title")} body={t("landing.feat3Body")} />
        </section>

        <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {t("common.appName")}. {t("common.tagline")}.
        </footer>
      </main>
    </>
  );
}

function DeptCard({ icon, title, desc, tone }: { icon: React.ReactNode; title: string; desc: string; tone: "fs" | "bt" }) {
  const glow = tone === "fs" ? "glow-fs" : "glow-bt";
  const color = tone === "fs" ? "text-fs" : "text-bt";
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
      whileHover={{ y: -4 }}
      className={`glass rounded-3xl p-8 ${glow} transition-all`}
    >
      <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-${tone}/10 ${color}`}
        style={{ background: tone === "fs" ? "var(--fs-glow)" : "var(--bt-glow)" }}>
        {icon}
      </div>
      <h3 className={`mt-4 text-2xl font-bold font-display ${color}`}>{title}</h3>
      <p className="mt-2 text-muted-foreground leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <h4 className="mt-3 font-semibold">{title}</h4>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { activateCode } from "@/lib/access.functions";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/activate-code")({ component: ActivatePage });

function ActivatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activate = useServerFn(activateCode);
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await activate({ data: { code: code.trim().toUpperCase() } });
      setSuccess(true);
      toast.success(t("activate.success"));
      qc.invalidateQueries();
      setTimeout(() => navigate({ to: "/dashboard" }), 1800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "rate_limited") toast.error(t("activate.rateLimited"));
      else toast.error(t("activate.invalid"));
    } finally { setLoading(false); }
  }

  return (
    <>
      <AppHeader />
      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="glass-strong rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden">
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 8, opacity: [0, 0.6, 0] }}
                  transition={{ duration: 1.2 }}
                  className="absolute inset-0 m-auto h-16 w-16 rounded-full bg-gradient-to-br from-fs to-bt"
                  style={{ transformOrigin: "center" }}
                />
              )}
            </AnimatePresence>
            <div className="relative">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {success ? <Sparkles className="h-7 w-7 animate-celebrate" /> : <KeyRound className="h-7 w-7" />}
              </div>
              <h1 className="mt-4 text-2xl font-bold font-display">{t("activate.title")}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{t("activate.sub")}</p>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={t("activate.placeholder")}
                  className="h-14 text-center font-mono text-lg tracking-[0.4em] uppercase"
                  maxLength={16}
                  required
                  autoFocus
                />
                <Button type="submit" size="lg" className="w-full h-12" disabled={loading || success}>
                  {loading ? t("common.loading") : t("activate.submit")}
                </Button>
              </form>
            </div>
          </div>
        </motion.div>
      </main>
    </>
  );
}

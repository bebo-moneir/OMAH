import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/providers";
import { useEffect } from "react";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName, preferred_language: localStorage.getItem("alpha-lang") || "en" },
          },
        });
        if (error) throw error;
        toast.success(t("auth.signupSuccess"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("auth.signinSuccess"));
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally { setLoading(false); }
  }

  return (
    <>
      <AppHeader />
      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="glass-strong rounded-3xl p-8 sm:p-10">
            <h1 className="text-3xl font-bold font-display">
              {mode === "signup" ? t("auth.createAccount") : t("auth.welcomeBack")}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === "signup" ? t("auth.createSub") : t("auth.loginSub")}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t("common.fullName")}</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("common.email")}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("common.password")}</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
              </div>
              <Button type="submit" size="lg" className="w-full h-11" disabled={loading}>
                {loading ? t("common.loading") : mode === "signup" ? t("common.signUp") : t("common.signIn")}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground transition"
            >
              {mode === "signup" ? t("auth.switchToLogin") : t("auth.switchToSignup")}
            </button>
          </div>
          <div className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition">← {t("common.home")}</Link>
          </div>
        </motion.div>
      </main>
    </>
  );
}

import { Link, useNavigate } from "@tanstack/react-router";
import { Languages, Moon, Sun, LogOut, LayoutDashboard } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth, useLang, useTheme } from "@/lib/providers";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AppHeader() {
  const { t } = useTranslation();
  const { lang, setLang } = useLang();
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-border/50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="hover:opacity-80 transition-opacity"><Logo /></Link>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            className="gap-1.5 font-semibold"
            aria-label={t("common.language")}
          >
            <Languages className="h-4 w-4" />
            <span className="text-xs">{lang === "en" ? "AR" : "EN"}</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label={t("common.theme")}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm" className="gap-1.5">
                <Link to="/dashboard"><LayoutDashboard className="h-4 w-4" />{t("common.dashboard")}</Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await supabase.auth.signOut();
                  toast.success(t("auth.signoutSuccess"));
                  navigate({ to: "/" });
                }}
                aria-label={t("common.signOut")}
              >
                <LogOut className="h-4 w-4 rtl-flip" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="ms-1">
              <Link to="/auth">{t("common.signIn")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

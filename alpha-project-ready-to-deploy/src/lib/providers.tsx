import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "./i18n";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

/* -------- Language + RTL -------- */
type Lang = "en" | "ar";
interface LangCtx { lang: Lang; setLang: (l: Lang) => void; dir: "ltr" | "rtl"; }
const LanguageContext = createContext<LangCtx | null>(null);

function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return (localStorage.getItem("alpha-lang") as Lang) || "en";
  });
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    localStorage.setItem("alpha-lang", lang);
    i18n.changeLanguage(lang);
  }, [lang, dir]);

  const setLang = (l: Lang) => setLangState(l);
  return <LanguageContext.Provider value={{ lang, setLang, dir }}>{children}</LanguageContext.Provider>;
}
export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
};

/* -------- Theme -------- */
type Theme = "dark" | "light";
interface ThemeCtx { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void; }
const ThemeContext = createContext<ThemeCtx | null>(null);

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("alpha-theme") as Theme) || "dark";
  });
  useEffect(() => {
    const el = document.documentElement;
    el.classList.remove("dark", "light");
    el.classList.add(theme);
    localStorage.setItem("alpha-theme", theme);
  }, [theme]);
  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, toggle: () => setThemeState(theme === "dark" ? "light" : "dark") }}>
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
};

/* -------- Auth -------- */
interface AuthCtx { user: User | null; session: Session | null; loading: boolean; }
const AuthContext = createContext<AuthCtx>({ user: null, session: null, loading: true });

function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return <AuthContext.Provider value={{ user: session?.user ?? null, session, loading }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);

/* -------- Combined -------- */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </I18nextProvider>
  );
}

export { useTranslation };

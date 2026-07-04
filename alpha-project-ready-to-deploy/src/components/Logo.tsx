import { useTranslation } from "react-i18next";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const { t } = useTranslation();
  const px = size === "lg" ? 44 : size === "sm" ? 28 : 34;
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg width={px} height={px} viewBox="0 0 40 40" fill="none" aria-hidden>
        <defs>
          <linearGradient id="alphaLogoGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="oklch(0.78 0.16 175)" />
            <stop offset="1" stopColor="oklch(0.72 0.19 300)" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="38" height="38" rx="10" fill="url(#alphaLogoGrad)" opacity="0.15" stroke="url(#alphaLogoGrad)" strokeWidth="1.2" />
        <path d="M12 28 L20 12 L28 28 M15 22 H25" stroke="url(#alphaLogoGrad)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <div className="flex flex-col leading-none">
        <span className={`font-display font-bold tracking-tight ${text}`}>{t("common.appName")}</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t("common.tagline")}</span>
      </div>
    </div>
  );
}

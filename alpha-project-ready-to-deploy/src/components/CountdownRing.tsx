import { useTranslation } from "react-i18next";

export function CountdownRing({ daysLeft, totalDays = 30, size = 160 }: { daysLeft: number; totalDays?: number; size?: number }) {
  const { t } = useTranslation();
  const pct = Math.max(0, Math.min(1, daysLeft / totalDays));
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  const color = pct > 0.5 ? "oklch(0.78 0.16 155)" : pct > 0.2 ? "oklch(0.83 0.17 85)" : "oklch(0.68 0.22 25)";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="oklch(1 0 0 / 0.08)" strokeWidth="8" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth="8" fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.5s ease", filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold font-display" style={{ color }}>{Math.max(0, daysLeft)}</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{daysLeft === 1 ? t("dashboard.day") : t("dashboard.days")}</span>
      </div>
    </div>
  );
}

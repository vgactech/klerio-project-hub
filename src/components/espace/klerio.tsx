// Composants repris à l'identique du dépôt Klerio-26/KLERIO (src/components/ui.tsx et brand.tsx).
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-700 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
          <path d="M6 3.75h8.2L18.5 8v12.25H6V3.75Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M13.75 3.9V8.4h4.4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M8.7 12h6.6M8.7 15.2h4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="16.4" cy="16.9" r="2.1" fill="currentColor" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[1.35rem] font-black tracking-tight text-ink-900">Klerio</span>
          <span className="block whitespace-nowrap text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-brand-700">
            La paperasse, en clair
          </span>
        </span>
      )}
    </span>
  );
}

export function TrustLine({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-center gap-2 text-xs text-ink-500", className)}>
      <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
      Hébergement UE · chiffrement renforcé · aucune donnée utilisée pour entraîner l'IA
    </p>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("card p-5 sm:p-6", className)}>{children}</div>;
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="section-title mb-1">{eyebrow}</p>}
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "brand" | "success" | "warning" | "danger" | "info"; className?: string }) {
  const tones = {
    neutral: "bg-ink-100 text-ink-700",
    brand: "bg-brand-100 text-brand-800",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-900",
    danger: "bg-red-100 text-red-800",
    info: "bg-sky-100 text-sky-900",
  };
  return <span className={cn("badge", tones[tone], className)}>{children}</span>;
}

/** value en pourcentage (0–100), comme dans le dépôt d'origine. */
export function Progress({ value, tone = "brand", label }: { value: number; tone?: "brand" | "warning" | "danger"; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const colors = { brand: "bg-brand-600", warning: "bg-amber-500", danger: "bg-red-500" };
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={label ?? "Progression"}>
      <div className={cn("h-full rounded-full transition-all", colors[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatCard({ label, value, hint, icon, tone = "brand" }: { label: string; value: string; hint?: string; icon?: ReactNode; tone?: "brand" | "amber" | "sky" | "violet" }) {
  const tones = {
    brand: "bg-brand-50 text-brand-800",
    amber: "bg-amber-50 text-amber-900",
    sky: "bg-sky-50 text-sky-900",
    violet: "bg-violet-50 text-violet-900",
  };
  return (
    <div className="card-flat p-4">
      <div className="flex items-start gap-3">
        {icon && <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", tones[tone])}>{icon}</span>}
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
          <p className="mt-1 truncate text-lg font-bold">{value}</p>
          {hint && <p className="mt-0.5 truncate text-xs text-ink-500">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-300 px-6 py-10 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Alert({ children, tone = "info", title }: { children: ReactNode; tone?: "info" | "warning" | "danger" | "success"; title?: string }) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-950",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
    danger: "border-red-200 bg-red-50 text-red-950",
    success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed", tones[tone])} role="status">
      {title && <p className="mb-0.5 font-bold">{title}</p>}
      {children}
    </div>
  );
}

export function initials(name?: string | null, email?: string | null) {
  const src = (name || email || "?").trim();
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

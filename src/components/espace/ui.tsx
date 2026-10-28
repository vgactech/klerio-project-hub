// Adaptateurs vers les styles d'origine de Klerio-26/KLERIO (voir klerio.tsx et styles.css .klerio-app).
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Alert, EmptyState, Progress as KProgress, StatCard as KStat } from "./klerio";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("card p-5 sm:p-6", className)}>{children}</div>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="section-title">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-black tracking-tight">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-ink-600">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function StatCard({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
  return <KStat label={label} value={String(value)} {...(hint ? { hint } : {})} icon={icon} />;
}

/** value entre 0 et 1. */
export function Progress({ value }: { value: number }) {
  const pct = value * 100;
  return <KProgress value={pct} tone={pct >= 90 ? "danger" : pct >= 80 ? "warning" : "brand"} />;
}

export function Empty({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <EmptyState title={title} description={description ?? ""} action={action} />;
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return <div className="mb-4"><Alert tone="danger">{error}</Alert></div>;
}

export const btnPrimary = "btn-primary";
export const btnSecondary = "btn-secondary";
export const input = "input";

import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-ink-200/80 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-black tracking-tight">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-ink-600">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function StatCard({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-ink-600">{label}</p>
        {icon && <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-100 text-brand-800">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </Card>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}

export function Empty({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-300 bg-white/60 p-6 text-center">
      <p className="font-bold">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-ink-600">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return <p role="alert" className="mb-4 rounded-xl bg-accent-100 px-4 py-3 text-sm text-accent-700">⚠️ {error}</p>;
}

export const btnPrimary = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50";
export const btnSecondary = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-800 hover:bg-ink-50 disabled:opacity-50";
export const input = "w-full rounded-xl border border-ink-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-200/60";

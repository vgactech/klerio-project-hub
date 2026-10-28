import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Bell, BookOpen, Brain, CreditCard, FolderLock, Home, MessageCircle, ScanLine, ShieldCheck, Sparkles, UserRound, Users } from "lucide-react";
import { Logo, Progress, initials } from "@/components/espace/klerio";
import { formatBytes, FREE_PLAN } from "@/lib/espace/api";
import { useEspaceData } from "@/lib/espace/use-data";
import { cn } from "@/lib/utils";

// Coquille reprise à l'identique de Klerio-26/KLERIO (components/app-shell.tsx + app-nav.tsx).
export const Route = createFileRoute("/_authenticated/espace")({
  component: EspaceLayout,
});

const items = [
  { to: "/espace", label: "Accueil", icon: Home, exact: true },
  { to: "/espace/scanner", label: "Scanner", icon: ScanLine },
  { to: "/espace/coffre", label: "Coffre-fort", icon: FolderLock },
  { to: "/espace/assistant", label: "Assistant", icon: Sparkles },
  { to: "/espace/liens", label: "Liens officiels", icon: ShieldCheck },
  { to: "/espace/rappels", label: "Rappels", icon: Bell },
  { to: "/espace/famille", label: "Famille", icon: Users },
  { to: "/espace/quotas", label: "Mes quotas", icon: BookOpen },
  { to: "/espace/forfait", label: "Forfait et crédits", icon: CreditCard },
  { to: "/espace/compte", label: "Mon compte", icon: UserRound },
  { to: "/dashboard", label: "Mémoire", icon: Brain },
] as const;

function EspaceLayout() {
  const { user } = Route.useRouteContext() as { user: { email?: string | null; name?: string | null } };
  const { docs, reminders } = useEspaceData();
  const used = (docs ?? []).reduce((s, d) => s + (d.size || 0), 0);
  const limit = FREE_PLAN.storageBytes;
  const storagePct = (used / limit) * 100;
  const scanLimit = FREE_PLAN.scanPages;
  const scanRemaining = Math.max(0, scanLimit - (docs ?? []).length);
  const unread = (reminders ?? []).filter((r) => !r.done && new Date(r.dueAt) <= new Date()).length;
  const ini = initials(user?.name, user?.email);

  return (
    <div className="klerio-app min-h-dvh">
      <a href="#contenu" className="skip-link">Aller au contenu</a>
      <div className="mx-auto flex w-full max-w-[1400px]">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-ink-200/80 bg-white/55 px-4 py-5 backdrop-blur lg:flex">
          <Link to="/espace" className="mb-6 px-2" aria-label="Klerio, accueil">
            <Logo />
          </Link>
          <div className="mb-5 rounded-2xl border border-brand-200/70 bg-brand-50/80 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-brand-900">Gratuit</span>
              <Link to="/espace/forfait" className="link text-[0.7rem]">Gérer</Link>
            </div>
            <p className="mt-1 text-brand-800/80">
              {scanRemaining} page{scanRemaining > 1 ? "s" : ""} de scan restante{scanRemaining > 1 ? "s" : ""} sur {scanLimit}
            </p>
          </div>

          <nav aria-label="Navigation principale">
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    activeOptions={{ exact: "exact" in item }}
                    className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink-600 transition-colors hover:bg-ink-100"
                    activeProps={{ className: "!bg-brand-700 !text-white shadow-sm" }}
                  >
                    <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-auto space-y-3 pt-5">
            <div className="rounded-2xl border border-ink-200 bg-white/80 p-3">
              <div className="flex items-center justify-between text-[0.7rem] font-semibold text-ink-600">
                <span>Stockage</span>
                <span>{formatBytes(used)} / {formatBytes(limit)}</span>
              </div>
              <div className="mt-2">
                <Progress value={storagePct} tone={storagePct >= 90 ? "danger" : storagePct >= 80 ? "warning" : "brand"} label="Stockage utilisé" />
              </div>
            </div>
            <p className="flex items-start gap-1.5 px-1 text-[0.68rem] leading-relaxed text-ink-500">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Chiffré, hébergé en UE. L'IA ne sert jamais à entraîner un modèle.
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-24 lg:pb-0">
          <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-[#f6f4ee]/90 backdrop-blur">
            <div className="flex min-h-[64px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 lg:hidden">
                <Link to="/espace" aria-label="Klerio, accueil"><Logo compact /></Link>
              </div>
              <div className="hidden min-w-0 items-center gap-2 lg:flex">
                <p className="truncate text-sm text-ink-500">
                  Bonjour <span className="font-semibold text-ink-900">{user?.name ?? user?.email}</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Link to="/chat" className="btn-secondary hidden sm:inline-flex">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" /> Conversation
                </Link>
                <Link to="/espace/scanner" className="btn-primary hidden sm:inline-flex">
                  <ScanLine className="h-4 w-4" aria-hidden="true" /> Scanner
                </Link>
                <Link to="/espace/rappels" className="btn-ghost relative h-11 w-11 p-0" aria-label={`Rappels${unread > 0 ? `, ${unread} notifications non lues` : ""}`}>
                  <Bell className="h-5 w-5" aria-hidden="true" />
                  {unread > 0 && (
                    <span className="absolute right-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent-500 px-1 text-[0.6rem] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
                <Link to="/espace/compte" className="grid h-10 w-10 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white" aria-label={`Mon compte — ${ini}`}>
                  {ini}
                </Link>
              </div>
            </div>
          </header>
          <main id="contenu" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>

      <nav aria-label="Navigation rapide" className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="grid grid-cols-5">
          {[items[0], items[2], items[1], items[3], items[5]].map((item) => {
            const central = item.to === "/espace/scanner";
            return (
              <li key={item.to} className="flex justify-center">
                <Link
                  to={item.to}
                  activeOptions={{ exact: "exact" in item }}
                  className="flex min-h-[58px] w-full flex-col items-center justify-center gap-0.5 text-[0.68rem] font-semibold text-ink-500"
                  activeProps={{ className: "!text-brand-700" }}
                >
                  <span className={cn("grid place-items-center rounded-xl", central ? "h-10 w-12 bg-brand-700 text-white shadow-float" : "h-7 w-9")}>
                    <item.icon className={central ? "h-6 w-6" : "h-5 w-5"} aria-hidden="true" />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

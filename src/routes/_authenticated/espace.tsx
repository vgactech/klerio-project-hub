import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, BookOpen, CreditCard, FolderLock, Home, MessageCircle, ScanLine, ShieldCheck, Sparkles, UserRound, Users, Brain } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import mascot from "@/assets/mascotte.png.asset.json";

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
  const navigate = useNavigate();
  const qc = useQueryClient();
  function signOut() {
    qc.cancelQueries();
    qc.clear();
    lovable.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen bg-paper text-ink-900" style={{ fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif" }}>
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link to="/espace" className="flex items-center gap-2">
            <img src={mascot.url} alt="" width={36} height={36} className="h-9 w-9 rounded-full bg-ink-900 object-cover" />
            <span className="text-lg font-black tracking-tight">Klerio</span>
          </Link>
          <div className="flex-1" />
          <Link to="/chat" className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800">
            <MessageCircle className="h-4 w-4" /> Conversation
          </Link>
          <button onClick={signOut} className="min-h-[40px] rounded-xl px-3 text-sm font-semibold text-ink-700 hover:bg-ink-100">
            Se déconnecter
          </button>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[230px_1fr]">
        <nav aria-label="Navigation principale" className="hidden lg:block">
          <ul className="space-y-1">
            {items.map((it) => (
              <li key={it.to}>
                <Link
                  to={it.to}
                  activeOptions={{ exact: "exact" in it }}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink-600 hover:bg-ink-100"
                  activeProps={{ className: "!bg-brand-700 !text-white shadow-sm" }}
                >
                  <it.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0 pb-24 lg:pb-0">
          <Outlet />
        </main>
      </div>
      <nav aria-label="Navigation rapide" className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 lg:hidden">
        <ul className="grid grid-cols-5">
          {[items[0], items[2], items[1], items[3], items[5]].map((it) => (
            <li key={it.to}>
              <Link
                to={it.to}
                activeOptions={{ exact: "exact" in it }}
                className="flex flex-col items-center gap-1 py-2 text-[0.7rem] font-semibold text-ink-500"
                activeProps={{ className: "!text-brand-700" }}
              >
                <it.icon className="h-5 w-5" aria-hidden="true" />
                {it.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

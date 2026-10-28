import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { api } from "@/lib/espace/api";
import { initials } from "@/components/espace/klerio";

/** Pastille de profil en haut à droite : ouvre un menu avec « Mon compte » et « Se déconnecter ». */
export function UserMenu({ name, email }: { name?: string | null; email?: string | null }) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ini = initials(name, email);

  useEffect(() => {
    api<{ data: { photo?: string } | null }>("/api/espace/profile").then((r) => setPhoto(r.data?.photo ?? null)).catch(() => {});
    const onPhoto = (e: Event) => setPhoto((e as CustomEvent<string | null>).detail);
    window.addEventListener("klerio-photo", onPhoto);
    return () => window.removeEventListener("klerio-photo", onPhoto);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function signOut() {
    queryClient.cancelQueries();
    queryClient.clear();
    lovable.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menu du compte — ${ini}`}
        className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-brand-700 text-sm font-bold text-white"
      >
        {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : ini}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-ink-200 bg-white p-2 shadow-lg">
          <p className="truncate px-3 py-2 text-xs text-ink-500">{email ?? name}</p>
          <Link to="/espace/compte" role="menuitem" onClick={() => setOpen(false)} className="flex min-h-[40px] items-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink-900 hover:bg-ink-100">
            <UserRound className="h-4 w-4" aria-hidden="true" /> Mon compte
          </Link>
          <button type="button" role="menuitem" onClick={signOut} className="flex min-h-[40px] w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-ink-900 hover:bg-ink-100">
            <LogOut className="h-4 w-4" aria-hidden="true" /> Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

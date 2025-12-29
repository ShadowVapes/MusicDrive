import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function NavItem({ to, label, hint }) {
  const loc = useLocation();
  const active = loc.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition hover:bg-white/10 ${
        active ? 'bg-white/10' : ''
      }`}
    >
      <span className="font-medium">{label}</span>
      {hint ? <span className="text-xs text-white/50">{hint}</span> : null}
    </Link>
  );
}

export default function Sidebar() {
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="rounded-2xl bg-white/5 p-4 shadow-glow">
        <div className="text-lg font-semibold tracking-tight">Zenelejátszó</div>
        <div className="mt-1 text-xs text-white/50">Spotify feeling, de kicsit odabasz.</div>
      </div>

      <div className="rounded-2xl bg-white/5 p-2">
        <NavItem to="/" label="Hallgatás" hint="player" />
        <NavItem to="/admin" label="Admin" hint="upload" />
      </div>

      <div className="mt-auto rounded-2xl bg-white/5 p-4 text-xs text-white/50">
        Tip: adminban linket csak beillesztesz, aztán tölti ki magát.
      </div>
    </div>
  );
}

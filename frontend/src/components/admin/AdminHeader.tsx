'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navItems = [
  { href: '/admin/dashboard', label: 'Обзор' },
  { href: '/admin/organizations', label: 'Организации' },
  { href: '/admin/users', label: 'Пользователи' },
];

export default function AdminHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-sm">
      <div className="flex items-start justify-between gap-4 px-4 py-4 md:px-6">
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold md:text-xl">
            TeamInsight Admin
          </div>
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-300/80 md:text-sm">
            System Control
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm md:hidden"
        >
          Меню
        </button>
      </div>

      <div className="hidden border-t border-white/10 px-4 py-4 md:block md:px-6">
        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-cyan-500 text-black'
                    : 'bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {mobileOpen ? (
        <div className="border-t border-white/10 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-lg px-4 py-3 text-sm font-medium transition ${
                    active
                      ? 'bg-cyan-500 text-black'
                      : 'bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  projectId?: string;
}

export default function AppHeader({ projectId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const isProjectsActive = pathname === '/projects';
  const isDashboardActive =
    !!projectId && pathname === `/projects/${projectId}/dashboard`;

  const navItems = [
    {
      href: '/projects',
      label: 'Проекты',
      active: isProjectsActive,
    },
    ...(projectId
      ? [
          {
            href: `/projects/${projectId}/dashboard`,
            label: 'Панель проекта',
            active: isDashboardActive,
          },
        ]
      : []),
  ];

  return (
    <header className="border-b border-white/10 bg-[#111827] text-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-6 lg:px-8">
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold md:text-xl">
            TeamInsight
          </div>
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-300/80 md:text-sm">
            Project Analytics
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <nav className="flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  item.active
                    ? 'bg-cyan-500 text-black'
                    : 'bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
          >
            Выйти
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white md:hidden"
        >
          Меню
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-white/10 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-4 py-3 text-sm font-medium transition ${
                  item.active
                    ? 'bg-cyan-500 text-black'
                    : 'bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-lg bg-red-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-600"
          >
            Выйти
          </button>
        </div>
      ) : null}
    </header>
  );
}

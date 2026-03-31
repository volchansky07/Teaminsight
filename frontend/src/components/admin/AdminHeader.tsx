'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin/dashboard', label: 'Обзор' },
  { href: '/admin/organizations', label: 'Организации' },
  { href: '/admin/users', label: 'Пользователи' },
];

export default function AdminHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-white/10 bg-black">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-8 py-6">
        <Link href="/admin/dashboard" className="shrink-0">
          <div className="text-[28px] font-bold tracking-tight text-white">
            TeamInsight Admin
          </div>
          <div className="mt-1 text-[12px] uppercase tracking-[0.35em] text-white/35">
            System Control
          </div>
        </Link>

        <nav className="flex items-center gap-4">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'rounded-full px-6 py-3 text-[16px] transition',
                  active
                    ? 'bg-white text-black'
                    : 'text-white/70 hover:bg-white/5 hover:text-white',
                ].join(' ')}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
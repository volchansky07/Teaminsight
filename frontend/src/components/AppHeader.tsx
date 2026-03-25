'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';

interface AppHeaderProps {
  projectId?: string;
  projectRole?: 'OWNER' | 'MANAGER' | 'MEMBER' | null;
  systemRole?: string;
}

export default function AppHeader({
  projectId,
  projectRole,
  systemRole,
}: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isInsideProject = useMemo(() => {
    return !!projectId || /^\/projects\/[^/]+/.test(pathname);
  }, [projectId, pathname]);

  const canSeeMembers = useMemo(() => {
    return true;
  }, []);

  const navItems = useMemo(() => {
    if (!isInsideProject || !projectId) {
      return [
        {
          label: 'Проекты',
          href: '/projects',
          active: pathname === '/projects',
        },
      ];
    }

    return [
      {
        label: 'Проекты',
        href: '/projects',
        active: pathname === '/projects',
      },
      {
        label: 'Панель проекта',
        href: `/projects/${projectId}/dashboard`,
        active: pathname === `/projects/${projectId}/dashboard`,
      },
      {
        label: 'Аналитика',
        href: `/projects/${projectId}/analytics`,
        active: pathname === `/projects/${projectId}/analytics`,
      },
      {
        label: 'Отчёты',
        href: `/projects/${projectId}/reports`,
        active: pathname === `/projects/${projectId}/reports`,
      },
      ...(canSeeMembers
        ? [
            {
              label: 'Участники',
              href: `/projects/${projectId}/members`,
              active: pathname === `/projects/${projectId}/members`,
            },
          ]
        : []),
      {
        label: 'Архив',
        href: `/projects/${projectId}/archive`,
        active: pathname === `/projects/${projectId}/archive`,
      },
    ];
  }, [isInsideProject, projectId, pathname, canSeeMembers]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <header className="border-b border-white/10 bg-black">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-8 py-6">
        <Link href="/projects" className="shrink-0">
          <div className="text-[28px] font-bold tracking-tight text-white">
            TeamInsight
          </div>
          <div className="mt-1 text-[12px] uppercase tracking-[0.35em] text-white/35">
            Project Analytics
          </div>
        </Link>

        <nav className="flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'rounded-full px-8 py-4 text-[18px] transition',
                item.active
                  ? 'bg-white text-black'
                  : 'text-white/70 hover:text-white',
              ].join(' ')}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="rounded-2xl border border-white/10 bg-[#121212] px-8 py-4 text-[18px] text-white transition hover:bg-[#1a1a1a]"
        >
          Выйти
        </button>
      </div>
    </header>
  );
}
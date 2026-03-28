'use client';

import Link from 'next/link';
import api from '@/services/api';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

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

  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const resolvedProjectId = useMemo(() => {
    if (projectId) return projectId;

    const match = pathname.match(/^\/projects\/([^/]+)/);
    return match?.[1] ?? undefined;
  }, [projectId, pathname]);

  const isInsideProject = useMemo(() => {
    return !!resolvedProjectId;
  }, [resolvedProjectId]);

  const canSeeMembers = useMemo(() => {
    return true;
  }, []);

  const navItems = useMemo(() => {
    if (!isInsideProject || !resolvedProjectId) {
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
        href: `/projects/${resolvedProjectId}/dashboard`,
        active: pathname === `/projects/${resolvedProjectId}/dashboard`,
      },
      {
        label: 'Аналитика',
        href: `/projects/${resolvedProjectId}/analytics`,
        active: pathname === `/projects/${resolvedProjectId}/analytics`,
      },
      {
        label: 'Отчёты',
        href: `/projects/${resolvedProjectId}/reports`,
        active: pathname === `/projects/${resolvedProjectId}/reports`,
      },
      ...(canSeeMembers
        ? [
            {
              label: 'Участники',
              href: `/projects/${resolvedProjectId}/members`,
              active: pathname === `/projects/${resolvedProjectId}/members`,
            },
          ]
        : []),
      {
        label: 'Архив',
        href: `/projects/${resolvedProjectId}/archive`,
        active: pathname === `/projects/${resolvedProjectId}/archive`,
      },
    ];
  }, [isInsideProject, resolvedProjectId, pathname, canSeeMembers]);

  const loadUnreadNotificationsCount = async () => {
    try {
      const res = await api.get('/notifications/my/unread-count');
      setUnreadNotificationsCount(res.data?.count ?? 0);
    } catch (error) {
      console.error('Ошибка загрузки количества уведомлений:', error);
      setUnreadNotificationsCount(0);
    }
  };

  useEffect(() => {
    loadUnreadNotificationsCount();

    const interval = window.setInterval(() => {
      loadUnreadNotificationsCount();
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

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

        <nav className="flex items-center gap-5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'rounded-full px-8 py-4 text-[18px] whitespace-nowrap transition',
                item.active
                  ? 'bg-white text-black'
                  : 'text-white/70 hover:text-white',
              ].join(' ')}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={resolvedProjectId ? `/projects/${resolvedProjectId}/notifications` : '/projects'}
            className="relative flex h-[58px] w-[58px] items-center justify-center rounded-2xl border border-white/10 bg-[#121212] text-white transition hover:bg-[#1a1a1a]"
            aria-label="Открыть уведомления"
            title="Уведомления"
          >
            <span className="text-[22px]">🔔</span>

            {unreadNotificationsCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex min-h-[24px] min-w-[24px] items-center justify-center rounded-full border border-violet-900/50 bg-violet-600 px-1.5 text-[11px] font-semibold leading-none text-white shadow-[0_6px_20px_rgba(124,58,237,0.45)]">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            ) : null}
          </Link>

          <button
            onClick={handleLogout}
            className="rounded-2xl border border-white/10 bg-[#121212] px-8 py-4 text-[18px] text-white transition hover:bg-[#1a1a1a]"
          >
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}
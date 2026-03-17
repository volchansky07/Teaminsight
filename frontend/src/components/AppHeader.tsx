'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface Props {
  projectId?: string;
}

export default function AppHeader({ projectId }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const isProjectsActive = pathname === '/projects';
  const isDashboardActive =
    !!projectId && pathname === `/projects/${projectId}/dashboard`;

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800 bg-black/80 backdrop-blur-xl">
      <div className="max-w-[1600px] mx-auto px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link href="/projects" className="group">
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight group-hover:text-white transition">
                TeamInsight
              </span>
              <span className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                PROJECT ANALYTICS
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              href="/projects"
              className={`px-4 py-2 rounded-2xl text-sm font-medium transition ${
                isProjectsActive
                  ? 'bg-white text-black'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
              }`}
            >
              Проекты
            </Link>

            {projectId && (
              <Link
                href={`/projects/${projectId}/dashboard`}
                className={`px-4 py-2 rounded-2xl text-sm font-medium transition ${
                  isDashboardActive
                    ? 'bg-white text-black'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
                }`}
              >
                Панель проекта
              </Link>
            )}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="bg-neutral-900 border border-neutral-800 text-white px-4 py-2 rounded-2xl font-medium hover:bg-neutral-800 transition"
        >
          Выйти
        </button>
      </div>
    </header>
  );
}
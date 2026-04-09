'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import AppHeader from '@/components/AppHeader';
import InlineNotice from '@/components/InlineNotice';
import ConfirmActionModal from '@/components/ConfirmActionModal';
import { parseJwt } from '@/utils/auth';

interface Project {
  id: string;
  name: string;
  description?: string | null;
}

interface NoticeState {
  type: 'success' | 'error';
  message: string;
}

type OrganizationRole = 'OWNER' | 'MANAGER' | 'EMPLOYEE' | null;

function ProjectCard({
  project,
  isAdmin,
  onArchive,
}: {
  project: Project;
  isAdmin: boolean;
  onArchive: (project: Project) => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[#141414] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-[#171717] hover:shadow-[0_20px_70px_rgba(0,0,0,0.55)]">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
        <div className="absolute -inset-[1px] rounded-[32px] bg-gradient-to-r from-sky-500/10 via-violet-500/10 to-emerald-500/10 blur-xl" />
      </div>

      <div className="relative z-10 flex h-full min-h-[250px] flex-col justify-between">
        <Link
          href={`/projects/${project.id}/dashboard`}
          className="block"
          aria-label={`Открыть проект ${project.name}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="break-words text-3xl font-semibold tracking-tight text-white">
                {project.name}
              </h2>

              <p className="mt-5 text-lg leading-relaxed text-white/50">
                {project.description?.trim()
                  ? project.description
                  : 'Описание проекта отсутствует.'}
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl text-white/60 transition-all duration-300 group-hover:translate-x-1 group-hover:border-white/20 group-hover:bg-white/10 group-hover:text-white">
              →
            </div>
          </div>
        </Link>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-[0.18em] text-white/28">
              Рабочее пространство
            </div>
            <div className="mt-2 text-base text-white/65 transition group-hover:text-white/80">
              Нажмите на карточку, чтобы перейти в панель проекта
            </div>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onArchive(project);
              }}
              className="shrink-0 rounded-[18px] border border-amber-900/50 bg-amber-950/20 px-4 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-900/25 hover:text-amber-200"
            >
              Архивировать
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const [authToken, setAuthToken] = useState('');
  const [organizationRole, setOrganizationRole] =
    useState<OrganizationRole>(null);

  const [archiveProject, setArchiveProject] = useState<Project | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const isAdmin = useMemo(() => {
    return organizationRole === 'OWNER' || organizationRole === 'MANAGER';
  }, [organizationRole]);

  const resetProjectsState = () => {
    setProjects([]);
    setNotice(null);
    setShowForm(false);
    setName('');
    setDescription('');
  };

  useEffect(() => {
    const token = localStorage.getItem('token') || '';

    if (!token) {
      router.replace('/login');
      return;
    }

    const payload = parseJwt(token);

    if (!payload) {
      router.replace('/login');
      return;
    }

    if (payload.systemRole === 'SUPER_ADMIN') {
      router.replace('/admin/dashboard');
      return;
    }

    setAuthToken(token);

    if (
      payload.organizationRole === 'OWNER' ||
      payload.organizationRole === 'MANAGER' ||
      payload.organizationRole === 'EMPLOYEE'
    ) {
      setOrganizationRole(payload.organizationRole);
    } else {
      setOrganizationRole('EMPLOYEE');
    }
  }, [router]);

  useEffect(() => {
    const handleTokenSync = () => {
      const token = localStorage.getItem('token') || '';

      if (!token) {
        resetProjectsState();
        router.replace('/login');
        return;
      }

      if (token !== authToken) {
        const payload = parseJwt(token);

        if (!payload) {
          resetProjectsState();
          router.replace('/login');
          return;
        }

        if (payload.systemRole === 'SUPER_ADMIN') {
          resetProjectsState();
          router.replace('/admin/dashboard');
          return;
        }

        setAuthToken(token);

        if (
          payload.organizationRole === 'OWNER' ||
          payload.organizationRole === 'MANAGER' ||
          payload.organizationRole === 'EMPLOYEE'
        ) {
          setOrganizationRole(payload.organizationRole);
        } else {
          setOrganizationRole('EMPLOYEE');
        }
      }
    };

    window.addEventListener('focus', handleTokenSync);
    window.addEventListener('storage', handleTokenSync);

    return () => {
      window.removeEventListener('focus', handleTokenSync);
      window.removeEventListener('storage', handleTokenSync);
    };
  }, [authToken, router]);

  const loadProjects = async () => {
    try {
      const res = await api.get('/projects/my');
      setProjects(res.data ?? []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setNotice({
        type: 'error',
        message: 'Не удалось загрузить список проектов.',
      });
    }
  };

  useEffect(() => {
    if (!authToken || !organizationRole) return;
    loadProjects();
  }, [authToken, organizationRole]);

  const resetForm = () => {
    setName('');
    setDescription('');
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!name.trim()) {
      setNotice({
        type: 'error',
        message: 'Введите название проекта.',
      });
      return;
    }

    if (!description.trim()) {
      setNotice({
        type: 'error',
        message: 'Введите описание проекта.',
      });
      return;
    }

    try {
      setCreating(true);

      await api.post('/projects', {
        name: name.trim(),
        description: description.trim(),
      });

      await loadProjects();
      resetForm();
      setShowForm(false);

      setNotice({
        type: 'success',
        message: 'Проект успешно создан.',
      });
    } catch (error: any) {
      console.error('CREATE PROJECT ERROR FULL:', error);
      console.error('CREATE PROJECT ERROR STATUS:', error?.response?.status);
      console.error('CREATE PROJECT ERROR DATA:', error?.response?.data);
      console.error('CREATE PROJECT ERROR URL:', error?.config?.url);

      setNotice({
        type: 'error',
        message: 'Не удалось создать проект.',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleArchiveProject = async () => {
    if (!archiveProject) return;

    try {
      setArchiveLoading(true);
      setNotice(null);

      await api.patch(`/projects/${archiveProject.id}/archive`);

      setProjects((prev) => prev.filter((p) => p.id !== archiveProject.id));
      setArchiveProject(null);

      setNotice({
        type: 'success',
        message: 'Проект успешно архивирован.',
      });
    } catch (error) {
      console.error('Ошибка архивации проекта:', error);
      setNotice({
        type: 'error',
        message: 'Не удалось архивировать проект.',
      });
    } finally {
      setArchiveLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />

      <main className="mx-auto max-w-[1600px] px-8 py-10">
        <section className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.2em] text-white/35">
              РАБОЧЕЕ ПРОСТРАНСТВО
            </p>
            <h1 className="text-6xl font-semibold leading-[0.95] text-white">
              {isAdmin ? 'Управление проектами' : 'Мои проекты'}
            </h1>
            <p className="mt-4 max-w-[760px] text-xl leading-relaxed text-white/55">
              {isAdmin
                ? 'Создавайте проекты, управляйте командами и контролируйте проектную деятельность внутри платформы.'
                : 'Просматривайте проекты, в которых вы участвуете, и переходите к своим рабочим задачам.'}
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                if (!showForm) resetForm();
                setShowForm((prev) => !prev);
                setNotice(null);
              }}
              className="rounded-[20px] bg-white px-6 py-4 text-base font-medium text-black transition hover:bg-neutral-200"
            >
              {showForm ? 'Закрыть форму' : '+ Создать проект'}
            </button>
          )}
        </section>

        {notice && <InlineNotice type={notice.type} message={notice.message} />}

        {isAdmin && showForm && (
          <section className="mb-8 rounded-[32px] border border-white/10 bg-[#141414] p-7 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
            <div>
              <h2 className="text-3xl font-semibold text-white">
                Создание проекта
              </h2>
              <p className="mt-3 text-white/55">
                Добавьте новый проект и подготовьте рабочую среду для команды.
              </p>
            </div>

            <form onSubmit={createProject} className="mt-6 space-y-5">
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="mb-2 block text-sm text-white/60">
                    Название проекта
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Введите название проекта"
                    className="w-full rounded-[20px] border border-white/10 bg-[#1a1a1a] px-5 py-4 text-white outline-none transition placeholder:text-white/25 focus:border-white/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/60">
                    Описание проекта
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Кратко опишите цель и содержание проекта"
                    rows={4}
                    className="w-full resize-none rounded-[20px] border border-white/10 bg-[#1a1a1a] px-5 py-4 text-white outline-none transition placeholder:text-white/25 focus:border-white/20"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-[18px] bg-white px-5 py-3 font-medium text-black transition hover:bg-neutral-200 disabled:opacity-60"
                >
                  {creating ? 'Создание...' : 'Создать проект'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                    setNotice(null);
                  }}
                  className="rounded-[18px] border border-white/10 bg-white/5 px-5 py-3 font-medium text-white transition hover:bg-white/10"
                >
                  Отмена
                </button>
              </div>
            </form>
          </section>
        )}

        {projects.length === 0 ? (
          <section className="rounded-[32px] border border-white/10 bg-[#141414] p-12 text-center shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
            <h2 className="text-3xl font-semibold text-white">
              Проектов пока нет
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/55">
              {isAdmin
                ? 'Создайте первый проект, чтобы начать управление задачами, аналитикой и командной работой.'
                : 'Вас пока не добавили ни в один проект. После назначения проект появится здесь автоматически.'}
            </p>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isAdmin={isAdmin}
                onArchive={setArchiveProject}
              />
            ))}
          </section>
        )}
      </main>

      <ConfirmActionModal
        isOpen={!!archiveProject}
        title="Архивировать проект"
        description={
          archiveProject
            ? 'Проект «${archiveProject.name}» будет перенесён в архив. Все задачи проекта также будут архивированы.'
            : ''
        }
        confirmText="Архивировать"
        confirmVariant="danger"
        loading={archiveLoading}
        onClose={() => setArchiveProject(null)}
        onConfirm={handleArchiveProject}
      />
    </div>
  );
}
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/services/api';
import AppHeader from '@/components/AppHeader';
import InlineNotice from '@/components/InlineNotice';

interface Project {
  id: string;
  name: string;
  description?: string | null;
}

interface NoticeState {
  type: 'success' | 'error';
  message: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const [currentSystemRole, setCurrentSystemRole] = useState('');
  const [authToken, setAuthToken] = useState('');

  const isAdmin = useMemo(
    () => currentSystemRole === 'admin',
    [currentSystemRole],
  );

  const resetProjectsState = () => {
    setProjects([]);
    setNotice(null);
    setShowForm(false);
    setName('');
    setDescription('');
  };

  const syncAuthFromStorage = () => {
    const token = localStorage.getItem('token') || '';
    setAuthToken(token);

    if (!token) {
      setCurrentSystemRole('');
      return;
    }

    const payload = parseJwt(token);
    setCurrentSystemRole(payload?.role ?? '');
  };

  useEffect(() => {
    syncAuthFromStorage();
  }, []);

  useEffect(() => {
    const handleTokenSync = () => {
      const newToken = localStorage.getItem('token') || '';

      if (newToken !== authToken) {
        resetProjectsState();
        setAuthToken(newToken);

        const payload = parseJwt(newToken);
        setCurrentSystemRole(payload?.role ?? '');
      }
    };

    window.addEventListener('focus', handleTokenSync);
    window.addEventListener('storage', handleTokenSync);

    return () => {
      window.removeEventListener('focus', handleTokenSync);
      window.removeEventListener('storage', handleTokenSync);
    };
  }, [authToken]);

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
    if (!authToken) return;
    loadProjects();
  }, [authToken, currentSystemRole]);

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
    } catch (error) {
      console.error('Failed to create project:', error);
      setNotice({
        type: 'error',
        message: 'Не удалось создать проект.',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />

      <main className="max-w-[1600px] mx-auto px-8 py-10 space-y-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-bold tracking-tight">Мои проекты</h1>
            <p className="text-neutral-400 mt-3 text-lg">
              Управляйте проектами и переходите к их аналитике.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                if (!showForm) resetForm();
                setShowForm((prev) => !prev);
                setNotice(null);
              }}
              className="bg-white text-black px-5 py-3 rounded-2xl font-medium hover:bg-neutral-200 transition"
            >
              {showForm ? 'Закрыть' : '+ Создать проект'}
            </button>
          )}
        </div>

        {notice && <InlineNotice type={notice.type} message={notice.message} />}

        {isAdmin && showForm && (
          <form
            onSubmit={createProject}
            className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 space-y-5"
          >
            <div>
              <h2 className="text-2xl font-semibold">Создание проекта</h2>
              <p className="text-neutral-400 mt-2 text-sm">
                Добавьте новый проект и начните управлять задачами команды.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Название проекта
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Введите название проекта"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Описание
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Описание проекта"
                  rows={4}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={creating}
                className="bg-white text-black px-5 py-3 rounded-2xl font-medium hover:bg-neutral-200 transition disabled:opacity-60"
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
                className="bg-neutral-800 text-white px-5 py-3 rounded-2xl font-medium hover:bg-neutral-700 transition"
              >
                Отмена
              </button>
            </div>
          </form>
        )}

        {projects.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 text-center">
            <h2 className="text-2xl font-semibold">Проектов пока нет</h2>
            <p className="text-neutral-400 mt-3">
              {isAdmin
                ? 'Создайте первый проект, чтобы начать управлять задачами и аналитикой.'
                : 'Вас пока не добавили ни в один проект.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}/dashboard`}
                className="group bg-neutral-900 border border-neutral-800 rounded-3xl p-6 hover:border-neutral-600 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold">{project.name}</h2>
                    <p className="text-neutral-400 mt-3 text-sm">
                      {project.description?.trim()
                        ? project.description
                        : 'Откройте панель проекта, чтобы управлять задачами и отслеживать прогресс.'}
                    </p>
                  </div>

                  <div className="text-neutral-500 group-hover:text-white transition text-xl">
                    →
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between text-sm text-neutral-500">
                  <span>Рабочее пространство</span>
                  <span className="group-hover:text-white transition">
                    Открыть панель
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function parseJwt(
  token: string,
): { sub?: string; org?: string; role?: string } | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch {
    return null;
  }
}
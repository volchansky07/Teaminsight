'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '@/services/api';
import AppHeader from '@/components/AppHeader';
import InlineNotice from '@/components/InlineNotice';
import ConfirmActionModal from '@/components/ConfirmActionModal';

type ArchiveTab = 'projects' | 'tasks';
type ProjectArchiveReason = 'COMPLETED' | 'EMPTY' | 'MANUAL' | null;
type TaskArchiveReason =
  | 'HIDDEN'
  | 'COMPLETED'
  | 'PROJECT_ARCHIVED'
  | 'MANUAL'
  | 'AUTO'
  | null;

type ProjectSortType = 'archivedAt_desc' | 'archivedAt_asc' | 'name_asc';
type TaskSortType =
  | 'archivedAt_desc'
  | 'archivedAt_asc'
  | 'completedAt_desc'
  | 'title_asc';

interface ArchivedProject {
  id: string;
  name: string;
  description?: string | null;
  archivedAt?: string | null;
  archiveReason?: ProjectArchiveReason;
  isArchived?: boolean;
  createdAt?: string;
  owner?: {
    id: string;
    fullName: string;
    email?: string;
  } | null;
  _count?: {
    tasks?: number;
    members?: number;
  };
  tasksCompletedCount?: number;
}

interface ArchivedTask {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  archivedAt?: string | null;
  archiveReason?: TaskArchiveReason;
  requiresReport?: boolean;
  reportType?: 'TEXT' | 'LINK' | 'FILE' | 'IMAGE' | null;
  latestReportStatus?: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | null;
  assignee?: {
    id: string;
    fullName: string;
    email?: string;
  } | null;
  priority?: {
    id: string;
    name: string;
  } | null;
  complexity?: {
    id: string;
    name: string;
    pointsValue?: number;
  } | null;
  archivedBy?: {
    id: string;
    fullName: string;
    email?: string;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
}

interface NoticeState {
  type: 'success' | 'error';
  message: string;
}

function formatDate(dateString?: string | null) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('ru-RU');
}

function dateValue(dateString?: string | null) {
  if (!dateString) return 0;
  return new Date(dateString).getTime();
}

function translateProjectArchiveReason(reason?: ProjectArchiveReason) {
  switch (reason) {
    case 'COMPLETED':
      return 'Проект завершён';
    case 'EMPTY':
      return 'Пустой проект';
    case 'MANUAL':
      return 'Архивирован вручную';
    default:
      return '—';
  }
}

function getProjectArchiveReasonBadge(reason?: ProjectArchiveReason) {
  switch (reason) {
    case 'COMPLETED':
      return {
        label: 'Архив: завершён',
        className:
          'bg-emerald-950/40 text-emerald-300 border-emerald-900/50',
      };
    case 'EMPTY':
      return {
        label: 'Архив: пустой',
        className: 'bg-amber-950/40 text-amber-300 border-amber-900/50',
      };
    case 'MANUAL':
    default:
      return {
        label: 'Архив: вручную',
        className: 'bg-sky-950/40 text-sky-300 border-sky-900/50',
      };
  }
}

function translateTaskArchiveReason(reason?: TaskArchiveReason) {
  switch (reason) {
    case 'HIDDEN':
      return 'Скрыта менеджером';
    case 'COMPLETED':
      return 'Архивирована после завершения';
    case 'PROJECT_ARCHIVED':
      return 'Перенесена вместе с проектом';
    case 'MANUAL':
      return 'Перемещена менеджером';
    case 'AUTO':
      return 'Автоматически';
    default:
      return '—';
  }
}

function getTaskArchiveReasonBadge(reason?: TaskArchiveReason) {
  switch (reason) {
    case 'COMPLETED':
    case 'AUTO':
      return {
        label: 'Архив: завершена',
        className:
          'bg-emerald-950/40 text-emerald-300 border-emerald-900/50',
      };
    case 'PROJECT_ARCHIVED':
      return {
        label: 'Архив: проект',
        className: 'bg-sky-950/40 text-sky-300 border-sky-900/50',
      };
    case 'HIDDEN':
    case 'MANUAL':
    default:
      return {
        label: 'Архив: скрыта',
        className: 'bg-amber-950/40 text-amber-300 border-amber-900/50',
      };
  }
}

function translatePriorityName(name?: string) {
  if (!name) return '—';

  switch (name.toLowerCase()) {
    case 'critical':
      return 'Критический';
    case 'high':
      return 'Высокий';
    case 'medium':
      return 'Средний';
    case 'low':
      return 'Низкий';
    default:
      return name;
  }
}

function translateComplexityName(name?: string) {
  if (!name) return '—';

  switch (name.toLowerCase()) {
    case 'very hard':
      return 'Очень тяжёлая';
    case 'hard':
      return 'Тяжёлая';
    case 'medium':
      return 'Средняя';
    case 'easy':
      return 'Лёгкая';
    case 's':
      return 'Лёгкая';
    case 'm':
      return 'Средняя';
    case 'l':
      return 'Тяжёлая';
    default:
      return name;
  }
}

function translateReportType(type?: string | null) {
  switch (type) {
    case 'TEXT':
      return 'Текст';
    case 'LINK':
      return 'Ссылка';
    case 'FILE':
      return 'Файл';
    case 'IMAGE':
      return 'Изображение';
    default:
      return '—';
  }
}

function translateReportStatus(status?: string | null) {
  switch (status) {
    case 'SUBMITTED':
      return 'на проверке';
    case 'APPROVED':
      return 'принят';
    case 'REJECTED':
      return 'отклонён';
    default:
      return 'не указан';
  }
}

function getReportStatusStyles(status?: string | null) {
  switch (status) {
    case 'SUBMITTED':
      return 'bg-amber-950/40 text-amber-300 border-amber-900/50';
    case 'APPROVED':
      return 'bg-emerald-950/40 text-emerald-300 border-emerald-900/50';
    case 'REJECTED':
      return 'bg-red-950/40 text-red-300 border-red-900/50';
    default:
      return 'bg-neutral-900 text-neutral-300 border-neutral-700';
  }
}

function StatCard({
  title,
  value,
  subtitle,
  accent,
  progress,
}: {
  title: string;
  value: string;
  subtitle: string;
  accent: string;
  progress: number;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#141414] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] uppercase tracking-[0.18em] text-white/45">
            {title}
          </p>
          <h3 className="mt-3 text-5xl font-semibold leading-none text-white">
            {value}
          </h3>
        </div>

        <div
          className="mt-1 h-3 w-3 rounded-full"
          style={{ backgroundColor: accent }}
        />
      </div>

      <div className="mb-4 min-h-[40px]">
        <p className="text-sm text-white/55">{subtitle}</p>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.max(0, Math.min(progress, 100))}%`,
            backgroundColor: accent,
          }}
        />
      </div>
    </div>
  );
}

function ArchiveTabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-full px-6 py-3 text-base font-medium transition',
        active
          ? 'bg-white text-black'
          : 'border border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function ProjectArchiveCard({
  project,
  onRestore,
  canRestore,
}: {
  project: ArchivedProject;
  onRestore?: (project: ArchivedProject) => void;
  canRestore: boolean;
}) {
  const archiveBadge = getProjectArchiveReasonBadge(project.archiveReason);

  return (
    <div className="rounded-[28px] border border-white/10 bg-[#141414] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">{project.name}</h2>
          <p className="mt-3 text-white/55">
            {project.description?.trim()
              ? project.description
              : 'Описание проекта отсутствует.'}
          </p>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${archiveBadge.className}`}
        >
          {archiveBadge.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs text-neutral-300">
          Руководитель:{' '}
          <span className="text-white">
            {project.owner?.fullName ?? 'Не указан'}
          </span>
        </span>

        <span className="rounded-full border border-sky-900/50 bg-sky-950/40 px-3 py-1 text-xs text-sky-300">
          Участники: {project._count?.members ?? 0}
        </span>

        <span className="rounded-full border border-violet-900/50 bg-violet-950/40 px-3 py-1 text-xs text-violet-300">
          Задач: {project._count?.tasks ?? 0}
        </span>

        <span className="rounded-full border border-emerald-900/50 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-300">
          Выполнено: {project.tasksCompletedCount ?? 0}
        </span>

        <span className="rounded-full border border-amber-900/50 bg-amber-950/40 px-3 py-1 text-xs text-amber-300">
          Архивировано: {formatDate(project.archivedAt)}
        </span>
      </div>

      <div className="mt-5 rounded-[22px] border border-white/8 bg-black/20 p-5">
        <div className="mb-3 text-sm font-medium text-white/75">
          Архивный статус
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm text-white/60 md:grid-cols-2">
          <div>
            <span className="text-white/40">Причина архивации:</span>{' '}
            <span className="text-white">
              {translateProjectArchiveReason(project.archiveReason)}
            </span>
          </div>

          <div>
            <span className="text-white/40">Дата создания:</span>{' '}
            <span className="text-white">{formatDate(project.createdAt)}</span>
          </div>

          <div>
            <span className="text-white/40">Дата архивации:</span>{' '}
            <span className="text-white">{formatDate(project.archivedAt)}</span>
          </div>

          <div>
            <span className="text-white/40">Статус проекта:</span>{' '}
            <span className="text-white">
              {project.isArchived ? 'Архивный' : 'Активный'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {canRestore && onRestore ? (
          <button
            onClick={() => onRestore(project)}
            className="rounded-[18px] border border-sky-900/50 bg-sky-950/30 px-5 py-3 font-medium text-sky-300 transition hover:bg-sky-900/30"
          >
            Восстановить проект
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ArchivedTaskCard({
  task,
  projectName,
  onRestore,
  onOpenProjectArchive,
  canRestore,
}: {
  task: ArchivedTask;
  projectName?: string;
  onRestore?: (task: ArchivedTask) => void;
  onOpenProjectArchive?: () => void;
  canRestore: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const archiveBadge = getTaskArchiveReasonBadge(task.archiveReason);

  return (
    <div className="rounded-[28px] border border-neutral-800 bg-neutral-900 p-6 shadow-sm transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="break-words text-2xl font-semibold text-white">
              {task.title}
            </h2>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${archiveBadge.className}`}
            >
              {archiveBadge.label}
            </span>
          </div>

          {!isCollapsed ? (
            <p className="mt-3 text-neutral-400">
              {task.description?.trim()
                ? task.description
                : 'Описание задачи отсутствует.'}
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {projectName ? (
                <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
                  Проект: <span className="text-white">{projectName}</span>
                </span>
              ) : null}

              <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
                Исполнитель:{' '}
                <span className="text-white">
                  {task.assignee?.fullName ?? 'Не назначен'}
                </span>
              </span>

              <span className="rounded-full border border-amber-900/50 bg-amber-950/40 px-3 py-1 text-amber-300">
                Архивировано: {formatDate(task.archivedAt)}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
          title={isCollapsed ? 'Развернуть задачу' : 'Свернуть задачу'}
        >
          {isCollapsed ? '▾' : '▴'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            {projectName ? (
              <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
                Проект: <span className="text-white">{projectName}</span>
              </span>
            ) : null}

            <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
              Исполнитель:{' '}
              <span className="text-white">
                {task.assignee?.fullName ?? 'Не назначен'}
              </span>
            </span>

            <span className="rounded-full border border-sky-900/50 bg-sky-950/40 px-3 py-1 text-sky-300">
              Приоритет: {translatePriorityName(task.priority?.name)}
            </span>

            <span className="rounded-full border border-violet-900/50 bg-violet-950/40 px-3 py-1 text-violet-300">
              Сложность: {translateComplexityName(task.complexity?.name)}
              {typeof task.complexity?.pointsValue === 'number'
                ? ` · ${task.complexity.pointsValue} балл.`
                : ''}
            </span>

            {task.reportType ? (
              <span className="rounded-full border border-sky-900/50 bg-sky-950/40 px-3 py-1 text-sky-300">
                Отчёт: {translateReportType(task.reportType)}
              </span>
            ) : null}

            {task.latestReportStatus ? (
              <span
                className={`rounded-full border px-3 py-1 ${getReportStatusStyles(task.latestReportStatus)}`}
              >
                Статус отчёта: {translateReportStatus(task.latestReportStatus)}
              </span>
            ) : null}

            {task.completedAt ? (
              <span className="rounded-full border border-emerald-900/50 bg-emerald-950/40 px-3 py-1 text-emerald-300">
                Дата выполнения: {formatDate(task.completedAt)}
              </span>
            ) : null}

            <span className="rounded-full border border-amber-900/50 bg-amber-950/40 px-3 py-1 text-amber-300">
              Архивировано: {formatDate(task.archivedAt)}
            </span>
          </div>

          <div className="mt-5 rounded-2xl border border-white/5 bg-black/20 p-4">
            <div className="mb-3 text-lg font-medium text-white">
              Архивный статус
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <span className="text-neutral-500">Причина архивации:</span>{' '}
                  <span className="text-white">
                    {translateTaskArchiveReason(task.archiveReason)}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-500">Дедлайн:</span>{' '}
                  <span className="text-white">{formatDate(task.dueDate)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-neutral-500">Архивировал:</span>{' '}
                  <span className="text-white">
                    {task.archivedBy?.fullName ?? 'Система'}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-500">Баллы сложности:</span>{' '}
                  <span className="text-white">
                    {task.complexity?.pointsValue ?? '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {canRestore && onRestore ? (
              <button
                onClick={() => onRestore(task)}
                className="rounded-2xl border border-sky-900/50 bg-sky-950/20 px-5 py-3 text-lg font-medium text-sky-300 transition hover:bg-sky-900/20"
              >
                Восстановить задачу
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

export default function ProjectsArchivePage() {
  const [activeTab, setActiveTab] = useState<ArchiveTab>('projects');

  const [projects, setProjects] = useState<ArchivedProject[]>([]);
  const [tasks, setTasks] = useState<ArchivedTask[]>([]);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [notice, setNotice] = useState<NoticeState | null>(null);

  const [currentSystemRole, setCurrentSystemRole] = useState('');
  const [authToken, setAuthToken] = useState('');

  const params = useParams();
  const projectId = params.id as string;

  const [projectSearch, setProjectSearch] = useState('');
  const [projectArchiveTypeFilter, setProjectArchiveTypeFilter] =
    useState('all');
  const [projectSortBy, setProjectSortBy] =
    useState<ProjectSortType>('archivedAt_desc');

  const [taskSearch, setTaskSearch] = useState('');
  const [taskArchiveTypeFilter, setTaskArchiveTypeFilter] = useState('all');
  const [taskProjectFilter, setTaskProjectFilter] = useState('all');
  const [taskSortBy, setTaskSortBy] = useState<TaskSortType>('archivedAt_desc');

  const [restoreProject, setRestoreProject] =
    useState<ArchivedProject | null>(null);
  const [restoreTask, setRestoreTask] = useState<ArchivedTask | null>(null);

  const [restoreProjectLoading, setRestoreProjectLoading] = useState(false);
  const [restoreTaskLoading, setRestoreTaskLoading] = useState(false);

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

  const canManageArchive = useMemo(() => {
    return (
      currentSystemRole === 'MANAGER' ||
      currentSystemRole === 'OWNER' ||
      currentSystemRole === 'SUPER_ADMIN'
    );
  }, [currentSystemRole]);

  const loadArchivedProjects = async () => {
    try {
      setLoadingProjects(true);
      const res = await api.get('/projects/archive/my');
      setProjects(res.data ?? []);
    } catch (error) {
      console.error('Ошибка загрузки архива проектов:', error);
      setNotice({
        type: 'error',
        message: 'Не удалось загрузить архив проектов.',
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadArchivedTasks = async () => {
    try {
      setLoadingTasks(true);
      const res = await api.get('/tasks/archive/my');
      setTasks(res.data ?? []);
    } catch (error) {
      console.error('Ошибка загрузки архива задач:', error);
      setNotice({
        type: 'error',
        message: 'Не удалось загрузить архив задач.',
      });
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    loadArchivedProjects();
    loadArchivedTasks();
  }, []);

  const projectStats = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter(
      (project) => project.archiveReason === 'COMPLETED',
    ).length;
    const empty = projects.filter(
      (project) => project.archiveReason === 'EMPTY',
    ).length;
    const manual = projects.filter(
      (project) => project.archiveReason === 'MANUAL',
    ).length;

    return { total, completed, empty, manual };
  }, [projects]);

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(
      (task) =>
        task.archiveReason === 'COMPLETED' || task.archiveReason === 'AUTO',
    ).length;
    const hidden = tasks.filter(
      (task) =>
        task.archiveReason === 'HIDDEN' || task.archiveReason === 'MANUAL',
    ).length;
    const projectArchived = tasks.filter(
      (task) => task.archiveReason === 'PROJECT_ARCHIVED',
    ).length;

    return { total, completed, hidden, projectArchived };
  }, [tasks]);

  const taskProjects = useMemo(() => {
    const map = new Map<string, string>();

    for (const task of tasks) {
      if (task.project?.id && task.project?.name) {
        map.set(task.project.id, task.project.name);
      }
    }

    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [tasks]);

  const filteredProjects = useMemo(() => {
    const base = projects.filter((project) => {
      const normalizedSearch = projectSearch.trim().toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        project.name.toLowerCase().includes(normalizedSearch) ||
        (project.description ?? '').toLowerCase().includes(normalizedSearch);

      const matchesArchiveType =
        projectArchiveTypeFilter === 'all' ||
        (projectArchiveTypeFilter === 'completed' &&
          project.archiveReason === 'COMPLETED') ||
        (projectArchiveTypeFilter === 'empty' &&
          project.archiveReason === 'EMPTY') ||
        (projectArchiveTypeFilter === 'manual' &&
          project.archiveReason === 'MANUAL');

      return matchesSearch && matchesArchiveType;
    });

    return [...base].sort((a, b) => {
      switch (projectSortBy) {
        case 'archivedAt_asc':
          return dateValue(a.archivedAt) - dateValue(b.archivedAt);
        case 'name_asc':
          return a.name.localeCompare(b.name, 'ru');
        case 'archivedAt_desc':
        default:
          return dateValue(b.archivedAt) - dateValue(a.archivedAt);
      }
    });
  }, [projects, projectSearch, projectArchiveTypeFilter, projectSortBy]);

  const filteredTasks = useMemo(() => {
    const base = tasks.filter((task) => {
      const normalizedSearch = taskSearch.trim().toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        task.title.toLowerCase().includes(normalizedSearch) ||
        (task.description ?? '').toLowerCase().includes(normalizedSearch);

      const matchesArchiveType =
        taskArchiveTypeFilter === 'all' ||
        (taskArchiveTypeFilter === 'completed' &&
          (task.archiveReason === 'COMPLETED' ||
            task.archiveReason === 'AUTO')) ||
        (taskArchiveTypeFilter === 'hidden' &&
          (task.archiveReason === 'HIDDEN' ||
            task.archiveReason === 'MANUAL')) ||
        (taskArchiveTypeFilter === 'project' &&
          task.archiveReason === 'PROJECT_ARCHIVED');

      const matchesProject =
        taskProjectFilter === 'all' || task.project?.id === taskProjectFilter;

      return matchesSearch && matchesArchiveType && matchesProject;
    });

    return [...base].sort((a, b) => {
      switch (taskSortBy) {
        case 'archivedAt_asc':
          return dateValue(a.archivedAt) - dateValue(b.archivedAt);
        case 'completedAt_desc':
          return dateValue(b.completedAt) - dateValue(a.completedAt);
        case 'title_asc':
          return a.title.localeCompare(b.title, 'ru');
        case 'archivedAt_desc':
        default:
          return dateValue(b.archivedAt) - dateValue(a.archivedAt);
      }
    });
  }, [tasks, taskSearch, taskArchiveTypeFilter, taskProjectFilter, taskSortBy]);

  const handleResetProjectFilters = () => {
    setProjectSearch('');
    setProjectArchiveTypeFilter('all');
    setProjectSortBy('archivedAt_desc');
  };

  const handleResetTaskFilters = () => {
    setTaskSearch('');
    setTaskArchiveTypeFilter('all');
    setTaskProjectFilter('all');
    setTaskSortBy('archivedAt_desc');
  };

  const confirmRestoreProject = async () => {
    if (!restoreProject) return;

    try {
      setRestoreProjectLoading(true);
      setNotice(null);

      await api.patch(`/projects/${restoreProject.id}/unarchive`);
      await loadArchivedProjects();
      await loadArchivedTasks();

      setNotice({
        type: 'success',
        message: 'Проект успешно восстановлен из архива.',
      });

      setRestoreProject(null);
    } catch (error: any) {
      console.error('Ошибка восстановления проекта:', error);

      const serverMessage = error?.response?.data?.message;

      setNotice({
        type: 'error',
        message:
          typeof serverMessage === 'string'
            ? serverMessage
            : 'Не удалось восстановить проект.',
      });
    } finally {
      setRestoreProjectLoading(false);
    }
  };

  const confirmRestoreTask = async () => {
    if (!restoreTask) return;

    try {
      setRestoreTaskLoading(true);
      setNotice(null);

      await api.patch(`/tasks/${restoreTask.id}/unarchive`);
      await loadArchivedTasks();

      setNotice({
        type: 'success',
        message: 'Задача успешно восстановлена из архива.',
      });

      setRestoreTask(null);
    } catch (error: any) {
      console.error('Ошибка восстановления задачи:', error);

      const serverMessage = error?.response?.data?.message;

      setNotice({
        type: 'error',
        message:
          typeof serverMessage === 'string'
            ? serverMessage
            : 'Не удалось восстановить задачу.',
      });
    } finally {
      setRestoreTaskLoading(false);
    }
  };

  const isLoading = loadingProjects || loadingTasks;

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />

      <main className="mx-auto max-w-[1600px] px-8 py-10">
        <div className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3 text-sm text-white/45">
              <Link href="/projects" className="transition hover:text-white">
                Проекты
              </Link>
              <span>›</span>
              <span className="text-white/80">Единый архив</span>
            </div>

            <h1 className="text-6xl font-semibold leading-[0.95] text-white">
              Архив проектов и задач
            </h1>

            <p className="mt-4 max-w-[960px] text-xl leading-relaxed text-white/55">
              Здесь хранятся архивированные проекты и задачи. Архив позволяет
              сохранить историю работы, не загромождая активную рабочую область,
              и при необходимости восстановить сущности обратно в систему.
            </p>
          </div>

          <div className="flex items-center gap-4 rounded-[24px] border border-white/10 bg-[#141414] px-5 py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0b57f0] text-2xl font-semibold text-white">
              AR
            </div>

            <div>
              <div className="text-2xl font-semibold text-white">
                Единый архив
              </div>
              <div className="mt-1 text-base text-white/55">
                Проекты и задачи в одном архивном пространстве
              </div>
            </div>
          </div>
        </div>

        {notice && <InlineNotice type={notice.type} message={notice.message} />}

        {isLoading ? (
          <div className="rounded-[28px] border border-white/10 bg-[#141414] p-10 text-lg text-white/70">
            Загрузка архива...
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-4">
              <StatCard
                title="Архив проектов"
                value={`${projectStats.total}`}
                subtitle="Всего архивированных проектов"
                accent="#1da1ff"
                progress={Math.min(projectStats.total * 10, 100)}
              />

              <StatCard
                title="Архив задач"
                value={`${taskStats.total}`}
                subtitle="Всего архивированных задач"
                accent="#19d3a2"
                progress={Math.min(taskStats.total * 4, 100)}
              />

              <StatCard
                title="Завершённые задачи"
                value={`${taskStats.completed}`}
                subtitle="Задачи, архивированные после завершения"
                accent="#ffb020"
                progress={
                  taskStats.total
                    ? (taskStats.completed / taskStats.total) * 100
                    : 0
                }
              />

              <StatCard
                title="Скрытые задачи"
                value={`${taskStats.hidden}`}
                subtitle="Скрытые и вручную архивированные задачи"
                accent="#a78bfa"
                progress={
                  taskStats.total ? (taskStats.hidden / taskStats.total) * 100 : 0
                }
              />
            </section>

            <section className="mt-8 flex flex-wrap gap-3">
              <ArchiveTabButton
                active={activeTab === 'projects'}
                onClick={() => setActiveTab('projects')}
              >
                Проекты
              </ArchiveTabButton>

              <ArchiveTabButton
                active={activeTab === 'tasks'}
                onClick={() => setActiveTab('tasks')}
              >
                Задачи
              </ArchiveTabButton>
            </section>

            {activeTab === 'projects' ? (
              <>
                <section className="mt-8 rounded-[32px] border border-white/10 bg-[#141414] p-7 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                  <div className="mb-6">
                    <h2 className="text-4xl font-semibold text-white">
                      Поиск и фильтрация архивных проектов
                    </h2>
                    <p className="mt-2 text-lg text-white/55">
                      Находите проекты по названию, типу архивации и дате
                      помещения в архив.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm text-white/60">
                        Поиск
                      </label>
                      <input
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        placeholder="Введите название проекта или описание"
                        className="w-full rounded-[20px] border border-white/10 bg-[#1a1a1a] px-5 py-4 text-white outline-none transition placeholder:text-white/25 focus:border-white/20"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/60">
                        Тип архива
                      </label>
                      <select
                        value={projectArchiveTypeFilter}
                        onChange={(e) =>
                          setProjectArchiveTypeFilter(e.target.value)
                        }
                        className="w-full rounded-[20px] border border-white/10 bg-[#1a1a1a] px-5 py-4 text-white outline-none transition focus:border-white/20"
                      >
                        <option value="all">Все</option>
                        <option value="completed">Завершённые</option>
                        <option value="empty">Пустые</option>
                        <option value="manual">Архивированные вручную</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/60">
                        Сортировка
                      </label>
                      <select
                        value={projectSortBy}
                        onChange={(e) =>
                          setProjectSortBy(e.target.value as ProjectSortType)
                        }
                        className="w-full rounded-[20px] border border-white/10 bg-[#1a1a1a] px-5 py-4 text-white outline-none transition focus:border-white/20"
                      >
                        <option value="archivedAt_desc">
                          Сначала новые в архиве
                        </option>
                        <option value="archivedAt_asc">
                          Сначала старые в архиве
                        </option>
                        <option value="name_asc">По названию</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-white/50">
                      Найдено проектов:{' '}
                      <span className="text-white">
                        {filteredProjects.length}
                      </span>
                    </div>

                    <button
                      onClick={handleResetProjectFilters}
                      className="rounded-[18px] border border-white/10 bg-white/5 px-5 py-3 text-white transition hover:bg-white/10"
                    >
                      Сбросить фильтры
                    </button>
                  </div>
                </section>

                <section className="mt-8">
                  {filteredProjects.length === 0 ? (
                    <div className="rounded-[32px] border border-white/10 bg-[#141414] p-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                      <h2 className="text-3xl font-semibold text-white">
                        Архив проектов пока пуст
                      </h2>
                      <p className="mt-3 text-lg text-white/55">
                        Здесь будут отображаться завершённые и архивированные
                        проекты.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
                      {filteredProjects.map((project) => (
                        <ProjectArchiveCard
                          key={project.id}
                          project={project}
                          onRestore={setRestoreProject}
                          canRestore={canManageArchive}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </>
            ) : (
              <>
                <section className="mt-8 rounded-[32px] border border-white/10 bg-[#141414] p-7 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                  <div className="mb-6">
                    <h2 className="text-4xl font-semibold text-white">
                      Поиск и фильтрация архивных задач
                    </h2>
                    <p className="mt-2 text-lg text-white/55">
                      Находите задачи по названию, проекту, типу архивации и
                      дате помещения в архив.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
                    <div>
                      <label className="mb-2 block text-sm text-white/60">
                        Поиск
                      </label>
                      <input
                        value={taskSearch}
                        onChange={(e) => setTaskSearch(e.target.value)}
                        placeholder="Введите название задачи или описание"
                        className="w-full rounded-[20px] border border-white/10 bg-[#1a1a1a] px-5 py-4 text-white outline-none transition placeholder:text-white/25 focus:border-white/20"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/60">
                        Тип архива
                      </label>
                      <select
                        value={taskArchiveTypeFilter}
                        onChange={(e) =>
                          setTaskArchiveTypeFilter(e.target.value)
                        }
                        className="w-full rounded-[20px] border border-white/10 bg-[#1a1a1a] px-5 py-4 text-white outline-none transition focus:border-white/20"
                      >
                        <option value="all">Все</option>
                        <option value="completed">Завершённые</option>
                        <option value="hidden">Скрытые</option>
                        <option value="project">
                          Архивированные с проектом
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/60">
                        Проект
                      </label>
                      <select
                        value={taskProjectFilter}
                        onChange={(e) => setTaskProjectFilter(e.target.value)}
                        className="w-full rounded-[20px] border border-white/10 bg-[#1a1a1a] px-5 py-4 text-white outline-none transition focus:border-white/20"
                      >
                        <option value="all">Все проекты</option>
                        {taskProjects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/60">
                        Сортировка
                      </label>
                      <select
                        value={taskSortBy}
                        onChange={(e) =>
                          setTaskSortBy(e.target.value as TaskSortType)
                        }
                        className="w-full rounded-[20px] border border-white/10 bg-[#1a1a1a] px-5 py-4 text-white outline-none transition focus:border-white/20"
                      >
                        <option value="archivedAt_desc">
                          Сначала новые в архиве
                        </option>
                        <option value="archivedAt_asc">
                          Сначала старые в архиве
                        </option>
                        <option value="completedAt_desc">
                          По дате выполнения
                        </option>
                        <option value="title_asc">По названию</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-white/50">
                      Найдено задач:{' '}
                      <span className="text-white">{filteredTasks.length}</span>
                    </div>

                    <button
                      onClick={handleResetTaskFilters}
                      className="rounded-[18px] border border-white/10 bg-white/5 px-5 py-3 text-white transition hover:bg-white/10"
                    >
                      Сбросить фильтры
                    </button>
                  </div>
                </section>

                <section className="mt-8">
                  {filteredTasks.length === 0 ? (
                    <div className="rounded-[32px] border border-white/10 bg-[#141414] p-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                      <h2 className="text-3xl font-semibold text-white">
                        Архив задач пока пуст
                      </h2>
                      <p className="mt-3 text-lg text-white/55">
                        Здесь будут отображаться архивированные задачи по всем
                        вашим проектам.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
                      {filteredTasks.map((task) => (
                        <ArchivedTaskCard
                          key={task.id}
                          task={task}
                          projectName={task.project?.name}
                          canRestore={canManageArchive}
                          onRestore={(selectedTask) => setRestoreTask(selectedTask)}
                          onOpenProjectArchive={
                            task.project?.id
                              ? () => {
                                  window.location.href = `/projects/${task.project!.id}/archive`;
                                }
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>

      <ConfirmActionModal
        isOpen={canManageArchive && !!restoreProject}
        title="Восстановить проект"
        description={
          restoreProject
            ? `Проект «${restoreProject.name}» будет возвращён из архива в активную рабочую область.`
            : ''
        }
        confirmText="Восстановить"
        confirmVariant="primary"
        loading={restoreProjectLoading}
        onClose={() => setRestoreProject(null)}
        onConfirm={confirmRestoreProject}
      />

      <ConfirmActionModal
        isOpen={canManageArchive && !!restoreTask}
        title="Восстановить задачу"
        description={
          restoreTask
            ? `Задача «${restoreTask.title}» будет возвращена из архива в активную рабочую область проекта.`
            : ''
        }
        confirmText="Восстановить"
        confirmVariant="primary"
        loading={restoreTaskLoading}
        onClose={() => setRestoreTask(null)}
        onConfirm={confirmRestoreTask}
      />
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
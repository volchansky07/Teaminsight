'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import api, { API_BASE_URL } from '@/services/api';
import AppHeader from '@/components/AppHeader';
import InlineNotice from '@/components/InlineNotice';
import TaskReportsPanel from '@/components/TaskReportsPanel';
import TaskReportReviewModal from '@/components/TaskReportReviewModal';


interface TaskItem {
  id: string;
  title: string;
  requiresReport?: boolean;
  reportType?: 'TEXT' | 'LINK' | 'FILE' | 'IMAGE' | null;
  status: {
    id: string;
    name: string;
  };
  assignee?: {
    id: string;
    fullName: string;
    email?: string;
  } | null;
}

interface TaskReportItem {
  id: string;
  taskId: string;
  content?: string | null;
  fileUrl?: string | null;
  originalFileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  reportType: 'TEXT' | 'LINK' | 'FILE' | 'IMAGE';
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  managerComment?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  author?: {
    id: string;
    fullName: string;
    email?: string;
  } | null;
  task?: {
    id: string;
    title: string;
  } | null;
  reviewedBy?: {
    id: string;
    fullName: string;
  } | null;
}

interface NoticeState {
  type: 'success' | 'error';
  message: string;
}

type EmployeeReportFilter = 'ALL' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
type ManagerReportFilter = 'ALL' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'; 

function parseJwt(
  token: string,
): { sub?: string; org?: string; role?: string } | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function formatDate(dateString?: string | null) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('ru-RU');
}

function formatDateTime(dateString?: string | null) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('ru-RU');
}

function formatFileSize(size?: number | null) {
  if (!size || size <= 0) return '—';

  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} КБ`;

  return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
}

function getUploadUrl(fileUrl?: string | null) {
  if (!fileUrl) return null;
  if (fileUrl.startsWith('http')) return fileUrl;
  return `${API_BASE_URL}${fileUrl}`;
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
      return 'Не указан';
  }
}

function translateReportStatus(status?: string | null) {
  switch (status) {
    case 'SUBMITTED':
      return 'На проверке';
    case 'APPROVED':
      return 'Принят';
    case 'REJECTED':
      return 'Отклонён';
    default:
      return 'Неизвестно';
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
  accentClass,
}: {
  title: string;
  value: string;
  subtitle: string;
  accentClass: string;
}) {
  return (
    <div className="rounded-[28px] border border-neutral-800 bg-neutral-900 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] uppercase tracking-[0.18em] text-neutral-500">
            {title}
          </p>
          <div className="mt-4 text-5xl font-semibold leading-none text-white">
            {value}
          </div>
          <p className="mt-4 text-sm text-neutral-400">{subtitle}</p>
        </div>

        <div className={`mt-1 h-3 w-3 rounded-full ${accentClass}`} />
      </div>
    </div>
  );
}

function EmployeeReportCard({
  report,
  projectName,
}: {
  report: TaskReportItem;
  projectName: string;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const fileHref = getUploadUrl(report.fileUrl);

  return (
    <div className="rounded-[28px] border border-neutral-800 bg-neutral-900 p-6 shadow-sm transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="break-words text-2xl font-semibold text-white">
              {report.task?.title ?? 'Без названия задачи'}
            </h3>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${getReportStatusStyles(report.status)}`}
            >
              {translateReportStatus(report.status)}
            </span>
          </div>

          {isCollapsed ? (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {projectName ? (
                <span className="rounded-full border border-violet-900/50 bg-violet-950/40 px-3 py-1 text-violet-300">
                  Проект: {projectName}
                </span>
              ) : null}

              <span className="rounded-full border border-sky-900/50 bg-sky-950/40 px-3 py-1 text-sky-300">
                Тип: {translateReportType(report.reportType)}
              </span>

              <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
                Отправлен:{' '}
                <span className="text-white">{formatDateTime(report.createdAt)}</span>
              </span>
            </div>
          ) : (
            <p className="mt-3 text-neutral-400">
              Отчёт отправлен по задаче проекта и ожидает проверки либо уже
              обработан руководителем.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
          title={isCollapsed ? 'Развернуть отчёт' : 'Свернуть отчёт'}
        >
          {isCollapsed ? '▾' : '▴'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            {projectName ? (
              <span className="rounded-full border border-violet-900/50 bg-violet-950/40 px-3 py-1 text-violet-300">
                Проект: {projectName}
              </span>
            ) : null}

            <span className="rounded-full border border-sky-900/50 bg-sky-950/40 px-3 py-1 text-sky-300">
              Тип: {translateReportType(report.reportType)}
            </span>

            {report.reviewedAt ? (
              <span className="rounded-full border border-emerald-900/50 bg-emerald-950/40 px-3 py-1 text-emerald-300">
                Проверен: {formatDate(report.reviewedAt)}
              </span>
            ) : (
              <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
                Проверка ещё не завершена
              </span>
            )}

            {report.reviewedBy?.fullName ? (
              <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
                Проверил:{' '}
                <span className="text-white">{report.reviewedBy.fullName}</span>
              </span>
            ) : null}

            {report.originalFileName ? (
              <span className="rounded-full border border-violet-900/50 bg-violet-950/40 px-3 py-1 text-violet-300 break-all">
                Файл: {report.originalFileName}
              </span>
            ) : null}

            {report.fileSize ? (
              <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
                Размер: {formatFileSize(report.fileSize)}
              </span>
            ) : null}

            <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
              Отправлен:{' '}
              <span className="text-white">{formatDateTime(report.createdAt)}</span>
            </span>
          </div>

          {report.content ? (
            <div className="mt-5 rounded-2xl border border-white/5 bg-black/20 p-4">
              <div className="mb-2 text-sm font-medium text-neutral-300">
                Содержимое отчёта
              </div>
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-400">
                {report.content}
              </div>
            </div>
          ) : null}

          {report.managerComment ? (
            <div className="mt-5 rounded-2xl border border-amber-900/40 bg-amber-950/15 p-4">
              <div className="mb-2 text-sm font-medium text-amber-300">
                Комментарий руководителя
              </div>
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-amber-100/80">
                {report.managerComment}
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            {fileHref ? (
              <a
                href={fileHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-sky-900/50 bg-sky-950/30 px-4 py-2.5 text-sm font-medium text-sky-300 transition hover:bg-sky-900/30"
              >
                Открыть вложение
              </a>
            ) : null}

            {report.reportType === 'LINK' && report.content ? (
              <a
                href={report.content}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-900/30"
              >
                Открыть ссылку
              </a>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function ManagerReportCard({
  report,
  projectName,
  onOpen,
}: {
  report: TaskReportItem;
  projectName: string;
  onOpen: (report: TaskReportItem) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="rounded-[28px] border border-neutral-800 bg-neutral-900 p-6 shadow-sm transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="break-words text-2xl font-semibold text-white">
              {report.task?.title ?? 'Без названия задачи'}
            </h3>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${getReportStatusStyles(report.status)}`}
            >
              {translateReportStatus(report.status)}
            </span>
          </div>

          {isCollapsed ? (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {projectName ? (
                <span className="rounded-full border border-violet-900/50 bg-violet-950/40 px-3 py-1 text-violet-300">
                  Проект: {projectName}
                </span>
              ) : null}

              <span className="rounded-full border border-sky-900/50 bg-sky-950/40 px-3 py-1 text-sky-300">
                Тип: {translateReportType(report.reportType)}
              </span>

              {report.author?.fullName ? (
                <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
                  Сотрудник:{' '}
                  <span className="text-white">{report.author.fullName}</span>
                </span>
              ) : null}

              <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
                Отправлен:{' '}
                <span className="text-white">{formatDateTime(report.createdAt)}</span>
              </span>
            </div>
          ) : (
            <p className="mt-3 text-neutral-400">
              Отчёт сотрудника по задаче проекта. Доступен для просмотра,
              проверки и контроля истории изменений.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
          title={isCollapsed ? 'Развернуть отчёт' : 'Свернуть отчёт'}
        >
          {isCollapsed ? '▾' : '▴'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            {projectName ? (
              <span className="rounded-full border border-violet-900/50 bg-violet-950/40 px-3 py-1 text-violet-300">
                Проект: {projectName}
              </span>
            ) : null}

            <span className="rounded-full border border-sky-900/50 bg-sky-950/40 px-3 py-1 text-sky-300">
              Тип: {translateReportType(report.reportType)}
            </span>

            {report.author?.fullName ? (
              <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
                Сотрудник:{' '}
                <span className="text-white">{report.author.fullName}</span>
              </span>
            ) : null}

            {report.reviewedBy?.fullName ? (
              <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
                Проверил:{' '}
                <span className="text-white">{report.reviewedBy.fullName}</span>
              </span>
            ) : null}

            {report.reviewedAt ? (
              <span className="rounded-full border border-emerald-900/50 bg-emerald-950/40 px-3 py-1 text-emerald-300">
                Проверен: {formatDate(report.reviewedAt)}
              </span>
            ) : (
              <span className="rounded-full border border-amber-900/50 bg-amber-950/40 px-3 py-1 text-amber-300">
                Ожидает проверки
              </span>
            )}

            <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
              Отправлен:{' '}
              <span className="text-white">{formatDateTime(report.createdAt)}</span>
            </span>
          </div>

          {report.managerComment ? (
            <div className="mt-5 rounded-2xl border border-amber-900/40 bg-amber-950/15 p-4">
              <div className="mb-2 text-sm font-medium text-amber-300">
                Комментарий руководителя
              </div>
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-amber-100/80">
                {report.managerComment}
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => onOpen(report)}
              className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-900/30"
            >
              Открыть отчёт
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ProjectReportsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [reports, setReports] = useState<TaskReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentSystemRole, setCurrentSystemRole] = useState('');

  const [projectName, setProjectName] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<EmployeeReportFilter>('ALL');
  
  const [managerSearch, setManagerSearch] = useState('');
  const [managerStatusFilter, setManagerStatusFilter] =
    useState<ManagerReportFilter>('ALL');
  const [managerEmployeeFilter, setManagerEmployeeFilter] = useState('ALL');

  const [managerReviewReport, setManagerReviewReport] =
    useState<TaskReportItem | null>(null);

  const handleOpenManagerReport = (report: TaskReportItem) => {
    setManagerReviewReport(report);
  };

  const handleCloseManagerReport = () => {
    setManagerReviewReport(null);
  };
  
  const isManagerView = useMemo(() => {
    return currentSystemRole === 'admin';
  }, [currentSystemRole]);

  const managerEmployees = useMemo(() => {
    const unique = new Map<string, { id: string; fullName: string }>();

    reports.forEach((report) => {
      if (report.author?.id && report.author?.fullName) {
        unique.set(report.author.id, {
          id: report.author.id,
          fullName: report.author.fullName,
        });
      }
    });
  
    return Array.from(unique.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName, 'ru'),
    );
  }, [reports]);

  const employeeReports = useMemo(() => {
    const ownReports = reports.filter((report) => report.author?.id === currentUserId);

    const normalizedSearch = search.trim().toLowerCase();

    return ownReports
      .filter((report) => {
        const matchesStatus =
          statusFilter === 'ALL' || report.status === statusFilter;

        const taskTitle = report.task?.title?.toLowerCase() ?? '';
        const projectTitle = projectName.toLowerCase();
        const content = report.content?.toLowerCase() ?? '';
        const managerComment = report.managerComment?.toLowerCase() ?? '';

        const matchesSearch =
          !normalizedSearch ||
          taskTitle.includes(normalizedSearch) ||
          projectTitle.includes(normalizedSearch) ||
          content.includes(normalizedSearch) ||
          managerComment.includes(normalizedSearch);

        return matchesStatus && matchesSearch;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [reports, currentUserId, search, statusFilter, projectName]);


  const managerReports = useMemo(() => {
    const normalizedSearch = managerSearch.trim().toLowerCase();

    return reports
      .filter((report) => {
        const matchesStatus =
          managerStatusFilter === 'ALL' || report.status === managerStatusFilter;

        const matchesEmployee =
          managerEmployeeFilter === 'ALL' ||
          report.author?.id === managerEmployeeFilter;

        const taskTitle = report.task?.title?.toLowerCase() ?? '';
        const authorName = report.author?.fullName?.toLowerCase() ?? '';
        const content = report.content?.toLowerCase() ?? '';
        const comment = report.managerComment?.toLowerCase() ?? '';

        const matchesSearch =
          !normalizedSearch ||
          taskTitle.includes(normalizedSearch) ||
          authorName.includes(normalizedSearch) ||
          content.includes(normalizedSearch) ||
          comment.includes(normalizedSearch);

        return matchesStatus && matchesEmployee && matchesSearch;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [reports, managerSearch, managerStatusFilter, managerEmployeeFilter]);

  const managerReviewTask = useMemo(() => {
    if (!managerReviewReport?.task) return null;

    const matchedTask = tasks.find((task) => task.id === managerReviewReport.task?.id);

    if (matchedTask) return matchedTask;

    return {
      id: managerReviewReport.task.id,
      title: managerReviewReport.task.title,
      assignee: managerReviewReport.author
        ? {
            id: managerReviewReport.author.id,
            fullName: managerReviewReport.author.fullName,
          }
        : null,
      requiresReport: true,
      reportType: managerReviewReport.reportType,
    };
  }, [managerReviewReport, tasks]);

  const managerStats = useMemo(() => {
    return {
      total: reports.length,
      submitted: reports.filter((report) => report.status === 'SUBMITTED').length,
      approved: reports.filter((report) => report.status === 'APPROVED').length,
      rejected: reports.filter((report) => report.status === 'REJECTED').length,
    };
  }, [reports]);

  const employeeStats = useMemo(() => {
    const ownReports = reports.filter((report) => report.author?.id === currentUserId);

    return {
      total: ownReports.length,
      submitted: ownReports.filter((report) => report.status === 'SUBMITTED')
        .length,
      approved: ownReports.filter((report) => report.status === 'APPROVED')
        .length,
      rejected: ownReports.filter((report) => report.status === 'REJECTED')
        .length,
    };
  }, [reports, currentUserId]);

  const loadData = async () => {
  try {
    const projectRes = await api.get(`/projects/${projectId}`);
    setProjectName(projectRes.data?.name ?? '');

    const tasksRes = await api.get(`/tasks/project/${projectId}`);
    const loadedTasks: TaskItem[] = tasksRes.data ?? [];
    setTasks(loadedTasks);

      let loadedReports: TaskReportItem[] = [];

      if (loadedTasks.length > 0) {
        const reportResponses = await Promise.all(
          loadedTasks.map((task) =>
            api.get(`/task-reports/task/${task.id}`).catch(() => ({ data: [] })),
          ),
        );

        loadedReports = reportResponses.flatMap((res) => res.data ?? []);
      }

      setReports(loadedReports);
    } catch (error) {
      console.error('Ошибка загрузки отчётов проекта:', error);
      setNotice({
        type: 'error',
        message: 'Не удалось загрузить отчёты проекта.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token') || '';

    if (!token) return;

    const payload = parseJwt(token);
    setCurrentUserId(payload?.sub ?? '');
    setCurrentSystemRole(payload?.role ?? '');
  }, []);

  useEffect(() => {
    if (!projectId) return;
    loadData();
  }, [projectId]);

  const handleApproveReport = async (
    reportId: string,
    managerComment?: string,
  ) => {
    setNotice(null);

    try {
      await api.patch(`/task-reports/${reportId}/approve`, {
        managerComment: managerComment?.trim() || undefined,
      });

      await loadData();

      setNotice({
        type: 'success',
        message: 'Отчёт успешно принят.',
      });
    } catch (error: any) {
      console.error('Ошибка принятия отчёта:', error);

      const serverMessage = error?.response?.data?.message;

      setNotice({
        type: 'error',
        message:
          typeof serverMessage === 'string'
            ? serverMessage
            : 'Не удалось принять отчёт.',
      });
    }
  };

  const handleRejectReport = async (
    reportId: string,
    managerComment: string,
  ) => {
    setNotice(null);

    try {
      await api.patch(`/task-reports/${reportId}/reject`, {
        managerComment: managerComment.trim(),
      });

      await loadData();

      setNotice({
        type: 'success',
        message: 'Отчёт отклонён.',
      });
    } catch (error: any) {
      console.error('Ошибка отклонения отчёта:', error);

      const serverMessage = error?.response?.data?.message;

      setNotice({
        type: 'error',
        message:
          typeof serverMessage === 'string'
            ? serverMessage
            : 'Не удалось отклонить отчёт.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader projectId={projectId} />

      <main className="max-w-[1600px] mx-auto px-8 py-10 space-y-8">
        <div>
          <p className="text-neutral-500 text-sm uppercase tracking-[0.2em] mb-3">
            ОТЧЁТЫ ПО ПРОЕКТУ
          </p>
          <h1 className="text-5xl font-bold tracking-tight">
            {isManagerView ? 'Отчёты' : 'Мои отчёты'}
          </h1>
          <p className="text-neutral-400 mt-3 text-lg">
            {isManagerView
              ? 'Просматривайте, проверяйте и подтверждайте отчёты сотрудников по задачам проекта.'
              : 'Отслеживайте историю отправленных отчётов и их текущие статусы.'}
          </p>
        </div>

        {notice && <InlineNotice type={notice.type} message={notice.message} />}

        {loading ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10">
            Загрузка отчётов проекта...
          </div>
        ) : isManagerView ? (
        <>
          <section className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6">
            <StatCard
              title="Всего отчётов"
              value={`${managerStats.total}`}
              subtitle="Общее количество отчётов по проекту"
              accentClass="bg-sky-400"
            />

            <StatCard
              title="На проверке"
              value={`${managerStats.submitted}`}
              subtitle="Отчёты, ожидающие решения руководителя"
              accentClass="bg-amber-400"
            />

            <StatCard
              title="Принято"
              value={`${managerStats.approved}`}
              subtitle="Подтверждённые отчёты сотрудников"
              accentClass="bg-emerald-400"
            />

            <StatCard
              title="Отклонено"
              value={`${managerStats.rejected}`}
              subtitle="Отчёты, отправленные на доработку"
              accentClass="bg-red-400"
            />
          </section>

          <section className="rounded-[32px] border border-neutral-800 bg-neutral-900 p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-neutral-500 text-sm uppercase tracking-[0.2em] mb-3">
                  ЖУРНАЛ ОТЧЁТОВ
                </p>
                <h2 className="text-4xl font-semibold text-white">
                  Отчёты сотрудников
                </h2>
                <p className="mt-3 text-neutral-400 text-lg">
                  Просматривайте историю всех отчётов по проекту, фильтруйте данные и
                  открывайте нужный отчёт для проверки.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full xl:w-auto xl:min-w-[820px]">
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">
                    Поиск
                  </label>
                  <input
                    value={managerSearch}
                    onChange={(e) => setManagerSearch(e.target.value)}
                    placeholder="По задаче, сотруднику или комментарию"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 outline-none focus:border-white text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">
                    Статус
                  </label>
                  <select
                    value={managerStatusFilter}
                    onChange={(e) =>
                      setManagerStatusFilter(e.target.value as ManagerReportFilter)
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 outline-none focus:border-white text-white"
                  >
                    <option value="ALL">Все</option>
                    <option value="SUBMITTED">На проверке</option>
                    <option value="APPROVED">Принято</option>
                    <option value="REJECTED">Отклонено</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">
                    Сотрудник
                  </label>
                  <select
                    value={managerEmployeeFilter}
                    onChange={(e) => setManagerEmployeeFilter(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 outline-none focus:border-white text-white"
                  >
                    <option value="ALL">Все сотрудники</option>
                    {managerEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <TaskReportReviewModal
                isOpen={!!managerReviewReport && !!managerReviewTask}
                task={managerReviewTask}
                report={managerReviewReport}
                onClose={handleCloseManagerReport}
                onApprove={handleApproveReport}
                onReject={handleRejectReport}
              />
            </div>

            <div className="mt-6 rounded-2xl border border-white/5 bg-black/20 p-4 text-sm text-neutral-400">
              Раздел предназначен для контроля истории отчётов по проекту. Для
              оперативной проверки менеджер также может открывать отчёт прямо из
              kanban-доски.
            </div>

            <div className="mt-8">
              {managerReports.length === 0 ? (
                <div className="rounded-3xl border border-neutral-800 bg-neutral-950/70 p-10 text-center">
                  <h3 className="text-2xl font-semibold text-white">
                    Подходящих отчётов не найдено
                  </h3>
                  <p className="mt-3 text-neutral-400">
                    Попробуйте изменить параметры поиска или фильтрации.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
                  {managerReports.map((report) => (
                    <ManagerReportCard
                      key={report.id}
                      report={report}
                      projectName={projectName}
                      onOpen={handleOpenManagerReport}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      ) : (

            <section className="rounded-[32px] border border-neutral-800 bg-neutral-900 p-7">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-neutral-500 text-sm uppercase tracking-[0.2em] mb-3">
                    ИСТОРИЯ ОТЧЁТОВ
                  </p>
                  <h2 className="text-4xl font-semibold text-white">
                    Мои отчёты
                  </h2>
                  <p className="mt-3 text-neutral-400 text-lg">
                    Здесь отображаются все ваши отправленные отчёты по задачам
                    проекта.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full xl:w-auto xl:min-w-[560px]">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">
                      Поиск
                    </label>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="По названию задачи, проекта или комментарию."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 outline-none focus:border-white text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">
                      Статус
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(e.target.value as EmployeeReportFilter)
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 outline-none focus:border-white text-white"
                    >
                      <option value="ALL">Все</option>
                      <option value="SUBMITTED">На проверке</option>
                      <option value="APPROVED">Принято</option>
                      <option value="REJECTED">Отклонено</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/5 bg-black/20 p-4 text-sm text-neutral-400">
                Отчёты отправляются из kanban-доски через кнопку в бейдже
                задачи. Здесь вы можете только отслеживать их историю и статус.
              </div>

              <div className="mt-8">
                {employeeReports.length === 0 ? (
                  <div className="rounded-3xl border border-neutral-800 bg-neutral-950/70 p-10 text-center">
                    <h3 className="text-2xl font-semibold text-white">
                      Отчётов пока нет
                    </h3>
                    <p className="mt-3 text-neutral-400">
                      Когда вы отправите отчёт, он появится в
                      этом разделе.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
                    {employeeReports.map((report) => (
                      <EmployeeReportCard
                        key={report.id}
                        report={report}
                        projectName={projectName}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
      )}
      </main>
    </div>
  );
}
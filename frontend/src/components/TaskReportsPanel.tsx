'use client';

import { useMemo, useState } from 'react';
import InlineNotice from '@/components/InlineNotice';
import { API_BASE_URL } from '@/services/api';

interface TaskItem {
  id: string;
  title: string;
  requiresReport?: boolean;
  reportType?: 'TEXT' | 'LINK' | 'FILE' | 'IMAGE' | null;
  assignee?: {
    id: string;
    fullName: string;
  } | null;
  latestReportStatus?: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | null;
}

interface TaskReportItem {
  id: string;
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

interface Props {
  tasks: TaskItem[];
  reports: TaskReportItem[];
  currentUserId?: string;
  isManagerView?: boolean;
  onSubmit?: () => Promise<void> | void;
  onApprove?: (
    reportId: string,
    managerComment?: string,
  ) => Promise<void> | void;
  onReject?: (
    reportId: string,
    managerComment: string,
  ) => Promise<void> | void;
}

function translateReportType(type?: string | null) {
  switch (type) {
    case 'TEXT':
      return 'Текстовый отчёт';
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

function translateReportStatus(status: string) {
  switch (status) {
    case 'SUBMITTED':
      return 'На проверке';
    case 'APPROVED':
      return 'Принят';
    case 'REJECTED':
      return 'Отклонён';
    default:
      return status;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'SUBMITTED':
      return 'bg-amber-950/40 text-amber-300 border border-amber-900/50';
    case 'APPROVED':
      return 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/50';
    case 'REJECTED':
      return 'bg-red-950/40 text-red-300 border border-red-900/50';
    default:
      return 'bg-neutral-800 text-neutral-300 border border-neutral-700';
  }
}

function formatDate(dateString?: string | null) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('ru-RU');
}

function formatFileSize(size?: number | null) {
  if (!size) return '—';
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} КБ`;
  return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
}

function getUploadUrl(fileUrl?: string | null) {
  if (!fileUrl) return null;
  if (fileUrl.startsWith('http')) return fileUrl;
  return `${API_BASE_URL}${fileUrl}`;
}

export default function TaskReportsPanel({
  tasks,
  reports,
  currentUserId,
  isManagerView = false,
  onSubmit,
  onApprove,
  onReject,
}: Props) {
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [rejectingReportId, setRejectingReportId] = useState<string | null>(
    null,
  );
  const [approveLoadingId, setApproveLoadingId] = useState<string | null>(null);
  const [rejectLoadingId, setRejectLoadingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  const isMemberView = !isManagerView;

  const submittedReportsForManager = useMemo(() => {
    return reports.filter(
      (report) => report.status === 'SUBMITTED' && !!report.task?.id,
    );
  }, [reports]);

  const currentUserReports = useMemo(() => {
    return reports.filter((report) => report.author?.id === currentUserId);
  }, [reports, currentUserId]);

  const availableTasksForReport = useMemo(() => {
    return tasks.filter((task) => task.requiresReport);
  }, [tasks]);

  const handleApprove = async (reportId: string) => {
    setNotice(null);

    try {
      setApproveLoadingId(reportId);

      if (!onApprove) {
        throw new Error('onApprove handler is not provided');
      }

      await onApprove(reportId, 'Отчёт принят.');

      setNotice({
        type: 'success',
        message: 'Отчёт успешно принят.',
      });

      await onSubmit?.();
    } catch (error) {
      console.error(error);
      setNotice({
        type: 'error',
        message: 'Не удалось принять отчёт.',
      });
    } finally {
      setApproveLoadingId(null);
    }
  };

  const handleReject = async (reportId: string) => {
    setNotice(null);

    if (!rejectComment.trim()) {
      setNotice({
        type: 'error',
        message: 'Укажите причину отклонения отчёта.',
      });
      return;
    }

    try {
      setRejectLoadingId(reportId);

      if (!onReject) {
        throw new Error('onReject handler is not provided');
      }

      await onReject(reportId, rejectComment.trim());

      setNotice({
        type: 'success',
        message: 'Отчёт отклонён с комментарием.',
      });

      setRejectingReportId(null);
      setRejectComment('');

      await onSubmit?.();
    } catch (error) {
      console.error(error);
      setNotice({
        type: 'error',
        message: 'Не удалось отклонить отчёт.',
      });
    } finally {
      setRejectLoadingId(null);
    }
  };

  const renderReportBody = (report: TaskReportItem) => {
    const fileHref = getUploadUrl(report.fileUrl);

    if (report.reportType === 'IMAGE' && fileHref) {
      return (
        <div className="space-y-3">
          <a href={fileHref} target="_blank" rel="noopener noreferrer">
            <img
              src={fileHref}
              alt={report.originalFileName ?? 'Отчёт'}
              className="max-h-80 rounded-2xl border border-neutral-700 transition hover:opacity-90"
            />
          </a>
          <div className="text-sm text-neutral-400">
            {report.originalFileName ?? 'Изображение'} ·{' '}
            {formatFileSize(report.fileSize)}
          </div>
        </div>
      );
    }

    if (report.reportType === 'FILE' && fileHref) {
      return (
        <div className="space-y-3">
          <a
            href={fileHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sky-300 transition hover:text-sky-200"
          >
            📎 Открыть / скачать файл
          </a>

          <div className="space-y-1 text-sm text-neutral-400">
            <div>Имя файла: {report.originalFileName ?? '—'}</div>
            <div>Размер: {formatFileSize(report.fileSize)}</div>
            <div>Тип: {report.mimeType ?? '—'}</div>
          </div>
        </div>
      );
    }

    if (report.reportType === 'LINK') {
      const href = report.content?.trim();
      const isValidLink =
        href?.startsWith('http://') || href?.startsWith('https://');

      return isValidLink ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="break-all text-sky-300 transition hover:text-sky-200"
        >
          {href}
        </a>
      ) : (
        <div className="whitespace-pre-wrap break-words text-white">
          {report.content || '—'}
        </div>
      );
    }

    return (
      <div className="whitespace-pre-wrap break-words text-white">
        {report.content || '—'}
      </div>
    );
  };

  return (
    <section className="space-y-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6 md:p-8">
      <div>
        <p className="mb-3 text-sm uppercase tracking-[0.2em] text-neutral-500">
          ОТЧЁТЫ ПО ЗАДАЧАМ
        </p>
        <h2 className="text-3xl font-bold tracking-tight">
          {isManagerView ? 'Отчёты сотрудников' : 'Мои отчёты'}
        </h2>
        <p className="mt-3 text-neutral-400">
          {isManagerView
            ? 'Проверяйте результаты выполнения задач и принимайте отчёты сотрудников.'
            : 'Отправляйте отчёты по задачам, которые требуют подтверждения руководителем.'}
        </p>
      </div>

      {notice && <InlineNotice type={notice.type} message={notice.message} />}

      {isManagerView ? (
        <div className="space-y-4">
          {submittedReportsForManager.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/40 p-8 text-center text-neutral-500">
              <p className="text-sm">Нет отчётов, ожидающих проверки</p>
              <p className="mt-2 text-xs text-neutral-600">
                Когда сотрудники отправят отчёты, они появятся здесь.
              </p>
            </div>
          ) : (
            submittedReportsForManager.map((report) => (
              <div
                key={report.id}
                className="space-y-4 rounded-3xl border border-neutral-700 bg-neutral-800 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {report.task?.title ?? 'Задача без названия'}
                    </h3>
                    <p className="mt-2 text-sm text-neutral-400">
                      Сотрудник:{' '}
                      {report.author?.fullName ?? 'Неизвестный сотрудник'}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      Отправлен: {formatDate(report.createdAt)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs ${getStatusBadge(
                      report.status,
                    )}`}
                  >
                    {translateReportStatus(report.status)}
                  </span>
                </div>

                <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-4">
                  <p className="mb-2 text-sm text-neutral-400">
                    Тип отчёта: {translateReportType(report.reportType)}
                  </p>
                  {renderReportBody(report)}
                </div>

                {rejectingReportId === report.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={rejectComment}
                      onChange={(e) => setRejectComment(e.target.value)}
                      placeholder="Укажите причину отклонения отчёта"
                      rows={4}
                      className="w-full resize-none rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none focus:border-white"
                    />

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleReject(report.id)}
                        disabled={rejectLoadingId === report.id}
                        className="rounded-2xl bg-red-600 px-5 py-3 font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
                      >
                        {rejectLoadingId === report.id
                          ? 'Отклонение...'
                          : 'Подтвердить отклонение'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRejectingReportId(null);
                          setRejectComment('');
                        }}
                        className="rounded-2xl bg-neutral-900 px-5 py-3 font-medium text-white transition hover:bg-neutral-700"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleApprove(report.id)}
                      disabled={approveLoadingId === report.id}
                      className="rounded-2xl bg-white px-5 py-3 font-medium text-black transition hover:bg-neutral-200 disabled:opacity-60"
                    >
                      {approveLoadingId === report.id ? 'Принятие...' : 'Принять'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRejectingReportId(report.id);
                        setRejectComment('');
                      }}
                      className="rounded-2xl border border-red-900/50 bg-red-950/30 px-5 py-3 font-medium text-red-300 transition hover:bg-red-900/30"
                    >
                      Отклонить
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">История моих отчётов</h3>

          {currentUserReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/40 p-8 text-center text-neutral-500">
              <p className="text-sm">Вы ещё не отправляли отчёты</p>
              {availableTasksForReport.length > 0 ? (
                <p className="mt-2 text-xs text-neutral-600">
                  Отправка выполняется из карточки задачи на kanban-доске.
                </p>
              ) : null}
            </div>
          ) : (
            currentUserReports.map((report) => (
              <div
                key={report.id}
                className="space-y-4 rounded-3xl border border-neutral-700 bg-neutral-800 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {report.task?.title ?? 'Отчёт без привязки к задаче'}
                    </h3>
                    <p className="mt-2 text-sm text-neutral-500">
                      Отправлен: {formatDate(report.createdAt)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs ${getStatusBadge(
                      report.status,
                    )}`}
                  >
                    {translateReportStatus(report.status)}
                  </span>
                </div>

                <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-4">
                  {renderReportBody(report)}
                </div>

                {report.managerComment ? (
                  <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-4">
                    <p className="mb-2 text-sm text-neutral-400">
                      Комментарий руководителя
                    </p>
                    <div className="whitespace-pre-wrap break-words text-white">
                      {report.managerComment}
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
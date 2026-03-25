'use client';

import { useMemo, useState } from 'react';
import { API_BASE_URL } from '@/services/api';

interface ReviewTask {
  id: string;
  title: string;
  assignee?: {
    id: string;
    fullName: string;
  } | null;
  requiresReport?: boolean;
  reportType?: 'TEXT' | 'LINK' | 'FILE' | 'IMAGE' | null;
}

interface ReviewReport {
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
  reviewedBy?: {
    id: string;
    fullName: string;
  } | null;
}

interface Props {
  isOpen: boolean;
  task: ReviewTask | null;
  report: ReviewReport | null;
  onClose: () => void;
  onApprove: (reportId: string, managerComment?: string) => Promise<void> | void;
  onReject: (reportId: string, managerComment: string) => Promise<void> | void;
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

function getStatusStyles(status?: string | null) {
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

export default function TaskReportReviewModal({
  isOpen,
  task,
  report,
  onClose,
  onApprove,
  onReject,
}: Props) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');

  const fileHref = useMemo(() => getUploadUrl(report?.fileUrl), [report?.fileUrl]);

  if (!isOpen || !task || !report) return null;

  const handleApprove = async () => {
    try {
      setLoading('approve');
      setError('');
      await onApprove(report.id, 'Отчёт принят.');
      onClose();
    } catch (e) {
      console.error(e);
      setError('Не удалось принять отчёт.');
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      setError('Укажите причину отклонения отчёта.');
      return;
    }

    try {
      setLoading('reject');
      setError('');
      await onReject(report.id, rejectComment.trim());
      setRejectComment('');
      setRejectMode(false);
      onClose();
    } catch (e) {
      console.error(e);
      setError('Не удалось отклонить отчёт.');
    } finally {
      setLoading(null);
    }
  };

  const renderBody = () => {
    if (report.reportType === 'TEXT') {
      return (
        <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
          <div className="mb-2 text-sm font-medium text-neutral-300">
            Содержимое отчёта
          </div>
          <div className="max-h-[320px] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-300">
            {report.content || '—'}
          </div>
        </div>
      );
    }

    if (report.reportType === 'LINK') {
      const href = report.content?.trim();
      const isValidLink =
        href?.startsWith('http://') || href?.startsWith('https://');

      return (
        <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
          <div className="mb-2 text-sm font-medium text-neutral-300">Ссылка</div>
          {isValidLink ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sky-300 transition hover:text-sky-200"
            >
              {href}
            </a>
          ) : (
            <div className="break-words text-neutral-300">{report.content || '—'}</div>
          )}
        </div>
      );
    }

    if (report.reportType === 'IMAGE' && fileHref) {
      return (
        <div className="space-y-4 rounded-2xl border border-white/5 bg-black/20 p-4">
          <div className="text-sm font-medium text-neutral-300">Изображение</div>
          <a href={fileHref} target="_blank" rel="noreferrer">
            <img
              src={fileHref}
              alt={report.originalFileName ?? 'Отчёт'}
              className="max-h-[360px] rounded-2xl border border-neutral-700 transition hover:opacity-90"
            />
          </a>
          <div className="flex flex-wrap gap-2 text-xs">
            {report.originalFileName ? (
              <span className="rounded-full border border-violet-900/50 bg-violet-950/40 px-3 py-1 text-violet-300">
                Файл: {report.originalFileName}
              </span>
            ) : null}
            {report.fileSize ? (
              <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
                Размер: {formatFileSize(report.fileSize)}
              </span>
            ) : null}
          </div>
          <a
            href={fileHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-xl border border-sky-900/50 bg-sky-950/30 px-4 py-2.5 text-sm font-medium text-sky-300 transition hover:bg-sky-900/30"
          >
            Открыть оригинал
          </a>
        </div>
      );
    }

    if (report.reportType === 'FILE' && fileHref) {
      return (
        <div className="space-y-4 rounded-2xl border border-white/5 bg-black/20 p-4">
          <div className="text-sm font-medium text-neutral-300">Файл отчёта</div>
          <div className="space-y-2 text-sm text-neutral-300">
            <div>Имя файла: {report.originalFileName ?? '—'}</div>
            <div>Размер: {formatFileSize(report.fileSize)}</div>
            <div>Тип: {report.mimeType ?? '—'}</div>
          </div>
          <a
            href={fileHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-xl border border-sky-900/50 bg-sky-950/30 px-4 py-2.5 text-sm font-medium text-sky-300 transition hover:bg-sky-900/30"
          >
            Открыть / скачать файл
          </a>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-neutral-400">
        Данные отчёта недоступны.
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[32px] border border-neutral-800 bg-neutral-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 px-6 py-5">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
              ПРОСМОТР ОТЧЁТА
            </p>
            <h2 className="text-2xl font-semibold text-white">{task.title}</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Исполнитель: {task.assignee?.fullName ?? report.author?.fullName ?? 'Неизвестно'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-sm text-white transition hover:bg-neutral-800"
          >
            Закрыть
          </button>
        </div>

        <div className="max-h-[calc(92vh-92px)] overflow-y-auto px-6 py-6">
          <div className="mb-5 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-violet-900/50 bg-violet-950/40 px-3 py-1 text-violet-300">
              Тип: {translateReportType(report.reportType)}
            </span>

            <span
              className={`rounded-full border px-3 py-1 ${getStatusStyles(report.status)}`}
            >
              Статус: {translateReportStatus(report.status)}
            </span>

            <span className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-neutral-300">
              Отправлен: {formatDateTime(report.createdAt)}
            </span>

            {report.reviewedAt ? (
              <span className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-neutral-300">
                Проверен: {formatDateTime(report.reviewedAt)}
              </span>
            ) : null}
          </div>

          {renderBody()}

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

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {report.status === 'SUBMITTED' && (
            <div className="mt-6 space-y-4">
              {rejectMode ? (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                  <label className="mb-2 block text-sm text-neutral-300">
                    Причина отклонения
                  </label>
                  <textarea
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    rows={4}
                    placeholder="Укажите, что нужно исправить в отчёте"
                    className="w-full resize-none rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-white"
                  />

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={handleReject}
                      disabled={loading === 'reject'}
                      className="rounded-2xl bg-red-600 px-5 py-3 font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
                    >
                      {loading === 'reject' ? 'Отклонение...' : 'Подтвердить отклонение'}
                    </button>

                    <button
                      onClick={() => {
                        setRejectMode(false);
                        setRejectComment('');
                        setError('');
                      }}
                      className="rounded-2xl border border-neutral-700 bg-neutral-950 px-5 py-3 font-medium text-white transition hover:bg-neutral-800"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={loading === 'approve'}
                    className="rounded-2xl bg-white px-5 py-3 font-medium text-black transition hover:bg-neutral-200 disabled:opacity-60"
                  >
                    {loading === 'approve' ? 'Принятие...' : 'Принять'}
                  </button>

                  <button
                    onClick={() => {
                      setRejectMode(true);
                      setError('');
                    }}
                    className="rounded-2xl border border-red-900/50 bg-red-950/30 px-5 py-3 font-medium text-red-300 transition hover:bg-red-900/30"
                  >
                    Отклонить
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
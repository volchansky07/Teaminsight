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
  isManagerView: boolean;
  isMemberView: boolean;
  currentUserId: string;
  onSubmitReport: (payload: {
    taskId: string;
    reportType: 'TEXT' | 'LINK' | 'FILE' | 'IMAGE';
    content: string;
  }) => Promise<void>;
  onSubmitFileReport: (formData: FormData) => Promise<void>;
  onApproveReport: (
    reportId: string,
    payload: { managerComment?: string },
  ) => Promise<void>;
  onRejectReport: (
    reportId: string,
    payload: { managerComment: string },
  ) => Promise<void>;
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
  isManagerView,
  isMemberView,
  currentUserId,
  onSubmitReport,
  onSubmitFileReport,
  onApproveReport,
  onRejectReport,
}: Props) {
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [reportContent, setReportContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [notice, setNotice] = useState<NoticeState | null>(null);

  const [rejectingReportId, setRejectingReportId] = useState<string | null>(null);
  const [approveLoadingId, setApproveLoadingId] = useState<string | null>(null);
  const [rejectLoadingId, setRejectLoadingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  const availableTasksForReport = useMemo(() => {
    return tasks.filter((task) => task.requiresReport);
  }, [tasks]);

  const selectedTask = useMemo(() => {
    return (
      availableTasksForReport.find((task) => task.id === selectedTaskId) ?? null
    );
  }, [availableTasksForReport, selectedTaskId]);

  const submittedReportsForManager = useMemo(() => {
    return reports.filter(
      (report) => report.status === 'SUBMITTED' && !!report.task?.id,
    );
  }, [reports]);

  const currentUserReports = useMemo(() => {
  return reports.filter((report) => report.author?.id === currentUserId);
}, [reports, currentUserId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNotice(null);

    const file = e.target.files?.[0];
    if (!file) return;

    const maxSizeMb = 10;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setNotice({
        type: 'error',
        message: `Файл слишком большой. Максимум ${maxSizeMb} МБ.`,
      });
      e.target.value = '';
      return;
    }

    if (selectedTask?.reportType === 'IMAGE' && !file.type.startsWith('image/')) {
      setNotice({
        type: 'error',
        message: 'Для этого отчёта нужно выбрать изображение.',
      });
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setSelectedFileName(file.name);
    setReportContent(file.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!selectedTaskId) {
      setNotice({
        type: 'error',
        message: 'Выберите задачу для отправки отчёта.',
      });
      return;
    }

    if (!selectedTask?.reportType) {
      setNotice({
        type: 'error',
        message: 'Для задачи не указан тип отчёта.',
      });
      return;
    }

    try {
      setSubmitting(true);

      if (
        selectedTask.reportType === 'FILE' ||
        selectedTask.reportType === 'IMAGE'
      ) {
        if (!selectedFile) {
          setNotice({
            type: 'error',
            message:
              selectedTask.reportType === 'IMAGE'
                ? 'Прикрепите изображение.'
                : 'Прикрепите файл.',
          });
          return;
        }

        const formData = new FormData();
        formData.append('taskId', selectedTaskId);
        formData.append('reportType', selectedTask.reportType);
        formData.append('file', selectedFile);

        await onSubmitFileReport(formData);
      } else {
        if (!reportContent.trim()) {
          setNotice({
            type: 'error',
            message:
              selectedTask.reportType === 'LINK'
                ? 'Вставьте ссылку.'
                : 'Заполните текст отчёта.',
          });
          return;
        }

        await onSubmitReport({
          taskId: selectedTaskId,
          reportType: selectedTask.reportType,
          content: reportContent.trim(),
        });
      }

      setNotice({
        type: 'success',
        message: 'Отчёт успешно отправлен на проверку.',
      });

      setSelectedTaskId('');
      setReportContent('');
      setSelectedFileName('');
      setSelectedFile(null);
    } catch (error) {
      console.error(error);
      setNotice({
        type: 'error',
        message: 'Не удалось отправить отчёт.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (reportId: string) => {
    setNotice(null);

    try {
      setApproveLoadingId(reportId);

      await onApproveReport(reportId, {
        managerComment: 'Отчёт принят.',
      });

      setNotice({
        type: 'success',
        message: 'Отчёт успешно принят.',
      });
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

      await onRejectReport(reportId, {
        managerComment: rejectComment.trim(),
      });

      setNotice({
        type: 'success',
        message: 'Отчёт отклонён с комментарием.',
      });

      setRejectingReportId(null);
      setRejectComment('');
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

  const renderReportInput = () => {
    if (!selectedTask?.reportType) return null;

    if (selectedTask.reportType === 'TEXT') {
      return (
        <div>
          <label className="block text-sm text-neutral-400 mb-2">
            Текстовый отчёт
          </label>
          <textarea
            value={reportContent}
            onChange={(e) => setReportContent(e.target.value)}
            placeholder="Введите текст отчёта"
            rows={5}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white resize-none"
          />
        </div>
      );
    }

    if (selectedTask.reportType === 'LINK') {
      return (
        <div>
          <label className="block text-sm text-neutral-400 mb-2">
            Ссылка
          </label>
          <input
            value={reportContent}
            onChange={(e) => setReportContent(e.target.value)}
            placeholder="Вставьте ссылку"
            className="w-full bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
          />
        </div>
      );
    }

    if (
      selectedTask.reportType === 'FILE' ||
      selectedTask.reportType === 'IMAGE'
    ) {
      const acceptValue =
        selectedTask.reportType === 'IMAGE'
          ? 'image/*'
          : '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,image/*';

      return (
        <div className="space-y-3">
          <label className="block text-sm text-neutral-400">
            Прикрепление файла
          </label>

          <label className="inline-flex items-center gap-3 cursor-pointer bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-3 hover:border-white transition">
            <span className="text-xl">📎</span>
            <span className="text-white">
              {selectedTask.reportType === 'IMAGE'
                ? 'Выбрать изображение'
                : 'Выбрать файл'}
            </span>
            <input
              type="file"
              accept={acceptValue}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <div className="text-sm text-neutral-400">
            {selectedFileName
              ? `Выбран файл: ${selectedFileName}`
              : 'Файл пока не выбран'}
          </div>

          <div className="text-xs text-neutral-500">
            Поддерживается реальная загрузка файла на сервер. Максимальный размер —
            10 МБ.
          </div>
        </div>
      );
    }

    return null;
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
              className="max-h-80 rounded-2xl border border-neutral-700 hover:opacity-90 transition"
            />
          </a>
          <div className="text-sm text-neutral-400">
            {report.originalFileName ?? 'Изображение'} · {formatFileSize(report.fileSize)}
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
            className="inline-flex items-center gap-2 text-sky-300 hover:text-sky-200 transition"
          >
            📎 Открыть / скачать файл
          </a>

          <div className="text-sm text-neutral-400 space-y-1">
            <div>Имя файла: {report.originalFileName ?? '—'}</div>
            <div>Размер: {formatFileSize(report.fileSize)}</div>
            <div>Тип: {report.mimeType ?? '—'}</div>
          </div>
        </div>
      );
    }

    if (report.reportType === 'LINK') {
      const href = report.content?.trim();
      const isValidLink = href?.startsWith('http://') || href?.startsWith('https://');

      return isValidLink ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-sky-300 hover:text-sky-200 break-all transition"
        >
          {href}
        </a>
      ) : (
        <div className="text-white whitespace-pre-wrap break-words">
          {report.content || '—'}
        </div>
      );
    }

    return (
      <div className="text-white whitespace-pre-wrap break-words">
        {report.content || '—'}
      </div>
    );
  };

  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 space-y-6">
      <div>
        <p className="text-neutral-500 text-sm uppercase tracking-[0.2em] mb-3">
          ОТЧЁТЫ ПО ЗАДАЧАМ
        </p>
        <h2 className="text-3xl font-bold tracking-tight">
          {isManagerView ? 'Отчёты сотрудников' : 'Мои отчёты'}
        </h2>
        <p className="text-neutral-400 mt-3">
          {isManagerView
            ? 'Проверяйте результаты выполнения задач и принимайте отчёты сотрудников.'
            : 'Отправляйте отчёты по задачам, которые требуют подтверждения руководителем.'}
        </p>
      </div>

      {notice && <InlineNotice type={notice.type} message={notice.message} />}

      {isMemberView && (
        <form
          onSubmit={handleSubmit}
          className="bg-neutral-800 border border-neutral-700 rounded-3xl p-6 space-y-5"
        >
          <div>
            <h3 className="text-xl font-semibold">Отправить отчёт</h3>
            <p className="text-neutral-400 mt-2 text-sm">
              Выберите задачу и приложите отчёт в требуемом формате.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Задача
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => {
                  setSelectedTaskId(e.target.value);
                  setReportContent('');
                  setSelectedFileName('');
                  setSelectedFile(null);
                  setNotice(null);
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
              >
                <option value="">Выберите задачу</option>
                {availableTasksForReport.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title} — {translateReportType(task.reportType)}
                  </option>
                ))}
              </select>
            </div>

            {selectedTask && (
              <div className="rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-300">
                Требуемый формат отчёта:{' '}
                <span className="text-white font-medium">
                  {translateReportType(selectedTask.reportType)}
                </span>
              </div>
            )}

            {renderReportInput()}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-white text-black px-5 py-3 rounded-2xl font-medium hover:bg-neutral-200 transition disabled:opacity-60"
            >
              {submitting ? 'Отправка...' : 'Отправить на проверку'}
            </button>
          </div>
        </form>
      )}

      {isManagerView && (
        <div className="space-y-4">
          {submittedReportsForManager.length === 0 ? (
            <div className="border border-dashed border-neutral-700 rounded-2xl p-8 text-center text-neutral-500 bg-neutral-950/40">
              <p className="text-sm">Нет отчётов, ожидающих проверки</p>
              <p className="text-xs mt-2 text-neutral-600">
                Когда сотрудники отправят отчёты, они появятся здесь.
              </p>
            </div>
          ) : (
            submittedReportsForManager.map((report) => (
              <div
                key={report.id}
                className="bg-neutral-800 border border-neutral-700 rounded-3xl p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {report.task?.title ?? 'Задача без названия'}
                    </h3>
                    <p className="text-neutral-400 text-sm mt-2">
                      Сотрудник: {report.author?.fullName ?? 'Неизвестный сотрудник'}
                    </p>
                    <p className="text-neutral-500 text-sm mt-1">
                      Отправлен: {formatDate(report.createdAt)}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs ${getStatusBadge(
                      report.status,
                    )}`}
                  >
                    {translateReportStatus(report.status)}
                  </span>
                </div>

                <div className="rounded-2xl bg-neutral-900 border border-neutral-700 p-4">
                  <p className="text-sm text-neutral-400 mb-2">
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
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white resize-none"
                    />

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleReject(report.id)}
                        disabled={rejectLoadingId === report.id}
                        className="bg-red-600 text-white px-5 py-3 rounded-2xl font-medium hover:bg-red-500 transition disabled:opacity-60"
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
                        className="bg-neutral-900 text-white px-5 py-3 rounded-2xl font-medium hover:bg-neutral-700 transition"
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
                      className="bg-white text-black px-5 py-3 rounded-2xl font-medium hover:bg-neutral-200 transition disabled:opacity-60"
                    >
                      {approveLoadingId === report.id ? 'Принятие...' : 'Принять'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRejectingReportId(report.id);
                        setRejectComment('');
                      }}
                      className="bg-red-950/30 border border-red-900/50 text-red-300 px-5 py-3 rounded-2xl font-medium hover:bg-red-900/30 transition"
                    >
                      Отклонить
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {isMemberView && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">История моих отчётов</h3>

          {currentUserReports.length === 0 ? (
            <div className="border border-dashed border-neutral-700 rounded-2xl p-8 text-center text-neutral-500 bg-neutral-950/40">
              <p className="text-sm">Вы ещё не отправляли отчёты</p>
            </div>
          ) : (
            currentUserReports.map((report) => (
              <div
                key={report.id}
                className="bg-neutral-800 border border-neutral-700 rounded-3xl p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">{report.task.title}</h3>
                    <p className="text-neutral-500 text-sm mt-2">
                      Отправлен: {formatDate(report.createdAt)}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs ${getStatusBadge(
                      report.status,
                    )}`}
                  >
                    {translateReportStatus(report.status)}
                  </span>
                </div>

                <div className="rounded-2xl bg-neutral-900 border border-neutral-700 p-4">
                  {renderReportBody(report)}
                </div>

                {report.managerComment && (
                  <div className="rounded-2xl bg-neutral-900 border border-neutral-700 p-4">
                    <p className="text-sm text-neutral-400 mb-2">
                      Комментарий руководителя
                    </p>
                    <div className="text-white whitespace-pre-wrap break-words">
                      {report.managerComment}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
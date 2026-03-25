'use client';

import { useEffect, useMemo, useState } from 'react';

type ReportType = 'TEXT' | 'LINK' | 'FILE' | 'IMAGE';

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  reportType?: ReportType | null;
  latestReportStatus?: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | null;
}

interface Props {
  isOpen: boolean;
  task: TaskItem | null;
  onClose: () => void;
  onSubmitTextReport: (payload: {
    taskId: string;
    reportType: 'TEXT' | 'LINK';
    content: string;
  }) => Promise<void>;
  onSubmitFileReport: (formData: FormData) => Promise<void>;
}

function getReportTypeLabel(type?: ReportType | null) {
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
      return 'Отчёт';
  }
}

function getReportStatusLabel(status?: string | null) {
  switch (status) {
    case 'SUBMITTED':
      return 'На проверке';
    case 'APPROVED':
      return 'Принят';
    case 'REJECTED':
      return 'Отклонён';
    default:
      return 'Не отправлен';
  }
}

function getReportStatusClasses(status?: string | null) {
  switch (status) {
    case 'SUBMITTED':
      return 'border-amber-900/50 bg-amber-950/40 text-amber-300';
    case 'APPROVED':
      return 'border-emerald-900/50 bg-emerald-950/40 text-emerald-300';
    case 'REJECTED':
      return 'border-red-900/50 bg-red-950/40 text-red-300';
    default:
      return 'border-neutral-700 bg-neutral-900 text-neutral-300';
  }
}

export default function TaskReportSubmitModal({
  isOpen,
  task,
  onClose,
  onSubmitTextReport,
  onSubmitFileReport,
}: Props) {
  const [textValue, setTextValue] = useState('');
  const [linkValue, setLinkValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setTextValue('');
    setLinkValue('');
    setSelectedFile(null);
    setLocalError('');
    setSubmitting(false);
  }, [isOpen, task?.id]);

  const mode = useMemo<ReportType | null>(() => {
    return task?.reportType ?? null;
  }, [task]);

  if (!isOpen || !task || !mode) return null;

  const submitDisabled =
    submitting ||
    (mode === 'TEXT' && !textValue.trim()) ||
    (mode === 'LINK' && !linkValue.trim()) ||
    ((mode === 'FILE' || mode === 'IMAGE') && !selectedFile);

  const handleSubmit = async () => {
    setLocalError('');

    try {
      setSubmitting(true);

      if (mode === 'TEXT' || mode === 'LINK') {
        await onSubmitTextReport({
          taskId: task.id,
          reportType: mode,
          content: mode === 'TEXT' ? textValue.trim() : linkValue.trim(),
        });
      } else {
        if (!selectedFile) {
          setLocalError('Выберите файл для отправки.');
          return;
        }

        const formData = new FormData();
        formData.append('taskId', task.id);
        formData.append('reportType', mode);
        formData.append('file', selectedFile);

        await onSubmitFileReport(formData);
      }

      onClose();
    } catch (error) {
      console.error('Ошибка отправки отчёта из модального окна:', error);
      setLocalError('Не удалось отправить отчёт. Проверьте данные и попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[30px] border border-white/10 bg-[#141414] p-7 shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/40">
              ОТЧЁТ ПО ЗАДАЧЕ
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
              Прикрепить отчёт
            </h2>
            <p className="mt-3 text-base text-white/55">
              Отправьте отчёт по задаче на проверку руководителю проекта.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Закрыть
          </button>
        </div>

        <div className="mt-6 rounded-[24px] border border-white/10 bg-black/30 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xl font-semibold text-white">{task.title}</div>
              {task.description ? (
                <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-white/55">
                  {task.description}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-sky-900/50 bg-sky-950/40 px-3 py-1 text-xs font-medium text-sky-300">
                {getReportTypeLabel(mode)}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${getReportStatusClasses(task.latestReportStatus)}`}
              >
                {getReportStatusLabel(task.latestReportStatus)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {(mode === 'TEXT' || mode === 'LINK') && (
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                {mode === 'TEXT' ? 'Текст отчёта' : 'Ссылка на результат'}
              </label>

              {mode === 'TEXT' ? (
                <textarea
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  rows={8}
                  placeholder="Опишите выполненную работу, полученный результат, ссылки на материалы и важные детали..."
                  className="w-full rounded-[20px] border border-white/10 bg-[#1a1a1a] px-5 py-4 text-white outline-none transition placeholder:text-white/25 focus:border-white/20"
                />
              ) : (
                <input
                  type="url"
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-[20px] border border-white/10 bg-[#1a1a1a] px-5 py-4 text-white outline-none transition placeholder:text-white/25 focus:border-white/20"
                />
              )}
            </div>
          )}

          {(mode === 'FILE' || mode === 'IMAGE') && (
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                {mode === 'IMAGE' ? 'Загрузите изображение' : 'Загрузите файл'}
              </label>

              <div className="rounded-[20px] border border-dashed border-white/15 bg-[#1a1a1a] p-5">
                <input
                  type="file"
                  accept={mode === 'IMAGE' ? 'image/*' : undefined}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-white file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:font-medium file:text-black hover:file:opacity-90"
                />

                {selectedFile ? (
                  <div className="mt-3 text-sm text-white/60">
                    Выбран файл: <span className="text-white">{selectedFile.name}</span>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-white/40">
                    Поддерживается отправка одного файла за раз.
                  </div>
                )}
              </div>
            </div>
          )}

          {localError ? (
            <div className="rounded-[18px] border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">
              {localError}
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-[18px] border border-white/10 bg-white/5 px-5 py-3 text-white transition hover:bg-white/10"
          >
            Отмена
          </button>

          <button
            onClick={handleSubmit}
            disabled={submitDisabled}
            className="rounded-[18px] bg-white px-6 py-3 font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Отправка...' : 'Отправить отчёт'}
          </button>
        </div>
      </div>
    </div>
  );
}
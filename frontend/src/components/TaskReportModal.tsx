'use client';

import { useEffect, useState } from 'react';

interface TaskItem {
  id: string;
  title: string;
  reportType?: 'TEXT' | 'LINK' | 'FILE' | 'IMAGE' | null;
}

interface Props {
  isOpen: boolean;
  task: TaskItem | null;
  onClose: () => void;
  onSubmit: (params: {
    taskId: string;
    reportType: 'TEXT' | 'LINK' | 'FILE' | 'IMAGE';
    content?: string;
    file?: File | null;
  }) => Promise<void> | void;
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

export default function TaskReportModal({
  isOpen,
  task,
  onClose,
  onSubmit,
}: Props) {
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setContent('');
      setFile(null);
      setFileName('');
      setError('');
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !task) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');

    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 10 * 1024 * 1024) {
      setError('Файл слишком большой. Максимум 10 МБ.');
      e.target.value = '';
      return;
    }

    if (task.reportType === 'IMAGE' && !selected.type.startsWith('image/')) {
      setError('Для этого отчёта нужно выбрать изображение.');
      e.target.value = '';
      return;
    }

    setFile(selected);
    setFileName(selected.name);
  };

  const handleSubmit = async () => {
    if (!task.reportType) {
      setError('Для задачи не указан тип отчёта.');
      return;
    }

    if (task.reportType === 'TEXT' || task.reportType === 'LINK') {
      if (!content.trim()) {
        setError(
          task.reportType === 'LINK'
            ? 'Вставьте ссылку.'
            : 'Заполните текст отчёта.',
        );
        return;
      }
    }

    if (task.reportType === 'FILE' || task.reportType === 'IMAGE') {
      if (!file) {
        setError(
          task.reportType === 'IMAGE'
            ? 'Прикрепите изображение.'
            : 'Прикрепите файл.',
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      setError('');

      await onSubmit({
        taskId: task.id,
        reportType: task.reportType,
        content: content.trim() || undefined,
        file,
      });

      onClose();
    } catch (e) {
      console.error(e);
      setError('Не удалось отправить отчёт.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderInput = () => {
    if (task.reportType === 'TEXT') {
      return (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Введите текст отчёта"
          rows={6}
          className="w-full resize-none rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-white"
        />
      );
    }

    if (task.reportType === 'LINK') {
      return (
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Вставьте ссылку"
          className="w-full rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-white"
        />
      );
    }

    if (task.reportType === 'FILE' || task.reportType === 'IMAGE') {
      const acceptValue =
        task.reportType === 'IMAGE'
          ? 'image/*'
          : '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,image/*';

      return (
        <div className="space-y-3">
          <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 transition hover:border-white">
            <span className="text-xl">📎</span>
            <span className="text-white">
              {task.reportType === 'IMAGE'
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
            {fileName ? `Выбран файл: ${fileName}` : 'Файл пока не выбран'}
          </div>

          <div className="text-xs text-neutral-500">
            Максимальный размер файла — 10 МБ.
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[32px] border border-neutral-800 bg-neutral-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 px-6 py-5">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
              ОТПРАВКА ОТЧЁТА
            </p>
            <h2 className="text-2xl font-semibold text-white">{task.title}</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Формат отчёта: {translateReportType(task.reportType)}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-sm text-white transition hover:bg-neutral-800"
          >
            Закрыть
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          {renderInput()}

          {error ? (
            <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-2xl bg-white px-5 py-3 font-medium text-black transition hover:bg-neutral-200 disabled:opacity-60"
            >
              {submitting ? 'Отправка...' : 'Отправить отчёт'}
            </button>

            <button
              onClick={onClose}
              className="rounded-2xl border border-neutral-700 bg-neutral-950 px-5 py-3 font-medium text-white transition hover:bg-neutral-800"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
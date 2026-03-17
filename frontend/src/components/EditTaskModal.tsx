'use client';

import { useEffect, useState } from 'react';
import InlineNotice from '@/components/InlineNotice';

interface StatusItem {
  id: string;
  name: string;
}

interface PriorityItem {
  id: string;
  name: string;
}

interface ComplexityItem {
  id: string;
  name: string;
}

interface ProjectMemberItem {
  userId: string;
  fullName: string;
  email?: string;
  roleInProject: string;
}

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  requiresReport?: boolean;
  reportType?: 'TEXT' | 'LINK' | 'FILE' | 'IMAGE' | null;
  status: {
    id: string;
    name: string;
  };
  assignee?: {
    id: string;
    fullName: string;
  } | null;
  priority?: {
    id: string;
    name: string;
  } | null;
  complexity?: {
    id: string;
    name: string;
  } | null;
}

interface NoticeState {
  type: 'success' | 'error';
  message: string;
}

interface Props {
  open: boolean;
  task: TaskItem | null;
  statuses: StatusItem[];
  priorities: PriorityItem[];
  complexities: ComplexityItem[];
  members: ProjectMemberItem[];
  onClose: () => void;
  onSave: (
    taskId: string,
    payload: {
      title: string;
      description?: string;
      statusId: string;
      priorityId: string;
      complexityId: string;
      assigneeId?: string;
      dueDate?: string;
      requiresReport: boolean;
      reportType?: 'TEXT' | 'LINK' | 'FILE' | 'IMAGE';
    },
  ) => Promise<void>;
}

function translateStatusName(name: string) {
  switch (name) {
    case 'Todo':
      return 'К выполнению';
    case 'In Progress':
      return 'В работе';
    case 'Done':
      return 'Выполнено';
    default:
      return name;
  }
}

function translatePriorityName(name: string) {
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

function translateComplexityName(name: string) {
  switch (name.toLowerCase()) {
    case 'very hard':
      return 'Очень тяжёлая';
    case 'hard':
      return 'Тяжёлая';
    case 'medium':
      return 'Средняя';
    case 'easy':
      return 'Лёгкая';
    default:
      return name;
  }
}

function translateRoleName(role: string) {
  switch (role) {
    case 'OWNER':
      return 'Владелец';
    case 'MANAGER':
      return 'Менеджер';
    case 'MEMBER':
      return 'Сотрудник';
    default:
      return role;
  }
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

function formatDateForInput(dateString?: string | null) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export default function EditTaskModal({
  open,
  task,
  statuses,
  priorities,
  complexities,
  members,
  onClose,
  onSave,
}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusId, setStatusId] = useState('');
  const [priorityId, setPriorityId] = useState('');
  const [complexityId, setComplexityId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [requiresReport, setRequiresReport] = useState(false);
  const [reportType, setReportType] = useState<
    'TEXT' | 'LINK' | 'FILE' | 'IMAGE' | ''
  >('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  useEffect(() => {
    if (!task) return;

    setTitle(task.title ?? '');
    setDescription(task.description ?? '');
    setStatusId(task.status?.id ?? '');
    setPriorityId(task.priority?.id ?? '');
    setComplexityId(task.complexity?.id ?? '');
    setAssigneeId(task.assignee?.id ?? '');
    setDueDate(formatDateForInput(task.dueDate));
    setRequiresReport(task.requiresReport ?? false);
    setReportType(task.reportType ?? '');
    setNotice(null);
  }, [task]);

  if (!open || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!title.trim()) {
      setNotice({
        type: 'error',
        message: 'Введите название задачи.',
      });
      return;
    }

    if (!description.trim()) {
      setNotice({
        type: 'error',
        message: 'Введите описание задачи.',
      });
      return;
    }

    if (!statusId || !priorityId || !complexityId) {
      setNotice({
        type: 'error',
        message: 'Заполните обязательные поля задачи.',
      });
      return;
    }

    if (!assigneeId) {
      setNotice({
        type: 'error',
        message: 'Выберите исполнителя.',
      });
      return;
    }

    if (!dueDate) {
      setNotice({
        type: 'error',
        message: 'Укажите дедлайн задачи.',
      });
      return;
    }

    if (requiresReport && !reportType) {
      setNotice({
        type: 'error',
        message: 'Выберите формат отчёта.',
      });
      return;
    }

    try {
      setSaving(true);

      await onSave(task.id, {
        title: title.trim(),
        description: description.trim(),
        statusId,
        priorityId,
        complexityId,
        assigneeId,
        dueDate,
        requiresReport,
        reportType: requiresReport ? (reportType as 'TEXT' | 'LINK' | 'FILE' | 'IMAGE') : undefined,
      });

      onClose();
    } catch (error) {
      console.error(error);
      setNotice({
        type: 'error',
        message: 'Не удалось сохранить изменения задачи.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-neutral-500 text-sm uppercase tracking-[0.2em] mb-3">
                РЕДАКТИРОВАНИЕ ЗАДАЧИ
              </p>
              <h2 className="text-3xl font-bold tracking-tight">
                Редактировать задачу
              </h2>
              <p className="text-neutral-400 mt-3">
                Обновите параметры задачи, исполнителя, сроки и требования к отчёту.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="bg-neutral-800 text-white px-4 py-2 rounded-2xl font-medium hover:bg-neutral-700 transition"
            >
              Закрыть
            </button>
          </div>

          {notice && <InlineNotice type={notice.type} message={notice.message} />}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm text-neutral-400 mb-2">
                  Название
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Введите название задачи"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-neutral-400 mb-2">
                  Описание
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Описание задачи"
                  rows={4}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Статус
                </label>
                <select
                  value={statusId}
                  onChange={(e) => setStatusId(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
                >
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {translateStatusName(status.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Приоритет
                </label>
                <select
                  value={priorityId}
                  onChange={(e) => setPriorityId(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
                >
                  {priorities.map((priority) => (
                    <option key={priority.id} value={priority.id}>
                      {translatePriorityName(priority.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Сложность
                </label>
                <select
                  value={complexityId}
                  onChange={(e) => setComplexityId(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
                >
                  {complexities.map((complexity) => (
                    <option key={complexity.id} value={complexity.id}>
                      {translateComplexityName(complexity.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Исполнитель
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
                >
                  <option value="">Выберите исполнителя</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.fullName} ({translateRoleName(member.roleInProject)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Дедлайн
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Требуется отчёт
                </label>
                <select
                  value={requiresReport ? 'yes' : 'no'}
                  onChange={(e) => {
                    const enabled = e.target.value === 'yes';
                    setRequiresReport(enabled);
                    if (!enabled) {
                      setReportType('');
                    }
                  }}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
                >
                  <option value="no">Нет</option>
                  <option value="yes">Да</option>
                </select>
              </div>

              {requiresReport && (
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">
                    Формат отчёта
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) =>
                      setReportType(
                        e.target.value as 'TEXT' | 'LINK' | 'FILE' | 'IMAGE',
                      )
                    }
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
                  >
                    <option value="">Выберите формат отчёта</option>
                    <option value="TEXT">{translateReportType('TEXT')}</option>
                    <option value="LINK">{translateReportType('LINK')}</option>
                    <option value="FILE">{translateReportType('FILE')}</option>
                    <option value="IMAGE">{translateReportType('IMAGE')}</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-white text-black px-5 py-3 rounded-2xl font-medium hover:bg-neutral-200 transition disabled:opacity-60"
              >
                {saving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="bg-neutral-800 text-white px-5 py-3 rounded-2xl font-medium hover:bg-neutral-700 transition"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
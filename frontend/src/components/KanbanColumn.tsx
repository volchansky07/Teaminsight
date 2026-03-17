'use client';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  requiresReport?: boolean;
  reportType?: 'TEXT' | 'LINK' | 'FILE' | 'IMAGE' | null;
  latestReportStatus?: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | null;
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
    weight?: number;
  } | null;
  complexity?: {
    id: string;
    name: string;
    pointsValue?: number;
  } | null;
}

interface StatusItem {
  id: string;
  name: string;
}

interface Props {
  title: string;
  tasks: Task[];
  statuses: StatusItem[];
  onStatusChange: (taskId: string, statusId: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  isMemberView?: boolean;
}

function getColumnStyles(title: string) {
  switch (title) {
    case 'К выполнению':
      return {
        wrapper:
          'bg-neutral-900 border border-sky-900/60 rounded-3xl p-5 min-h-[500px] shadow',
        badge:
          'px-3 py-1 rounded-full bg-sky-950/60 text-sky-300 text-sm border border-sky-900/70',
        accent: 'text-sky-400',
        empty:
          'border border-dashed border-sky-900/50 rounded-2xl p-8 text-center text-sky-200/70 bg-sky-950/20',
      };

    case 'В работе':
      return {
        wrapper:
          'bg-neutral-900 border border-amber-900/60 rounded-3xl p-5 min-h-[500px] shadow',
        badge:
          'px-3 py-1 rounded-full bg-amber-950/60 text-amber-300 text-sm border border-amber-900/70',
        accent: 'text-amber-400',
        empty:
          'border border-dashed border-amber-900/50 rounded-2xl p-8 text-center text-amber-200/70 bg-amber-950/20',
      };

    case 'Выполнено':
      return {
        wrapper:
          'bg-neutral-900 border border-emerald-900/60 rounded-3xl p-5 min-h-[500px] shadow',
        badge:
          'px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-300 text-sm border border-emerald-900/70',
        accent: 'text-emerald-400',
        empty:
          'border border-dashed border-emerald-900/50 rounded-2xl p-8 text-center text-emerald-200/70 bg-emerald-950/20',
      };

    default:
      return {
        wrapper:
          'bg-neutral-900 border border-neutral-800 rounded-3xl p-5 min-h-[500px] shadow',
        badge:
          'px-3 py-1 rounded-full bg-neutral-800 text-neutral-300 text-sm border border-neutral-700',
        accent: 'text-neutral-300',
        empty:
          'border border-dashed border-neutral-700 rounded-2xl p-8 text-center text-neutral-500',
      };
  }
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
      return 'Не указан';
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
      return 'не отправлен';
  }
}

function getPriorityStyles(name?: string) {
  switch (name?.toLowerCase()) {
    case 'critical':
      return 'bg-rose-950/40 text-rose-300 border-rose-900/50';
    case 'high':
    case 'высокий':
      return 'bg-red-950/40 text-red-300 border-red-900/50';
    case 'medium':
    case 'средний':
      return 'bg-amber-950/40 text-amber-300 border-amber-900/50';
    case 'low':
    case 'низкий':
      return 'bg-sky-950/40 text-sky-300 border-sky-900/50';
    default:
      return 'bg-neutral-800 text-neutral-300 border-neutral-700';
  }
}

function getComplexityStyles(name?: string) {
  switch (name?.toLowerCase()) {
    case 'very hard':
      return 'bg-pink-950/40 text-pink-300 border-pink-900/50';
    case 'hard':
    case 'тяжёлая':
    case 'тяжелая':
    case 'l':
      return 'bg-fuchsia-950/40 text-fuchsia-300 border-fuchsia-900/50';
    case 'medium':
    case 'средняя':
    case 'm':
      return 'bg-violet-950/40 text-violet-300 border-violet-900/50';
    case 'easy':
    case 'лёгкая':
    case 'легкая':
    case 's':
      return 'bg-emerald-950/40 text-emerald-300 border-emerald-900/50';
    default:
      return 'bg-neutral-800 text-neutral-300 border-neutral-700';
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

function formatDate(dateString?: string | null) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU');
}

function isOverdue(task: Task) {
  if (!task.dueDate) return false;
  if (task.status.name === 'Done') return false;

  const due = new Date(task.dueDate);
  const now = new Date();

  return due.getTime() < now.getTime();
}

function isDoneStatusLocked(
  task: Task,
  statusName: string,
  isMemberView: boolean,
) {
  if (!isMemberView) return false;
  if (statusName !== 'Done') return false;
  if (!task.requiresReport) return false;

  return task.latestReportStatus !== 'APPROVED';
}

export default function KanbanColumn({
  title,
  tasks,
  statuses,
  onStatusChange,
  onEditTask,
  onDeleteTask,
  isMemberView = false,
}: Props) {
  const styles = getColumnStyles(title);

  return (
    <div className={styles.wrapper}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className={`text-xl font-semibold ${styles.accent}`}>{title}</h2>
          <p className="text-xs text-neutral-500 mt-1">
            {tasks.length === 0
              ? 'В этой колонке пока нет задач'
              : `${tasks.length} ${tasks.length === 1 ? 'задача' : 'задач'}`}
          </p>
        </div>

        <div className={styles.badge}>{tasks.length}</div>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => {
          const overdue = isOverdue(task);

          return (
            <div
              key={task.id}
              className={`bg-neutral-800 border rounded-2xl p-4 transition ${
                overdue
                  ? 'border-red-900/60 hover:border-red-700/70'
                  : 'border-neutral-700 hover:border-neutral-500'
              } hover:bg-neutral-750`}
            >
              <div className="min-w-0 w-full">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold leading-tight break-words">
                    {task.title}
                  </h3>

                  {overdue && (
                    <span className="shrink-0 px-2.5 py-1 rounded-full text-xs border bg-red-950/30 text-red-300 border-red-900/50">
                      Просрочено
                    </span>
                  )}
                </div>

                {task.description && (
                  <p className="text-sm text-neutral-400 mt-2 leading-relaxed break-words">
                    {task.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="px-2.5 py-1 rounded-full text-xs border bg-neutral-900 text-neutral-300 border-neutral-700">
                    Исполнитель:{' '}
                    <span className="text-white">
                      {task.assignee?.fullName ?? 'Не назначен'}
                    </span>
                  </span>

                  {task.priority && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs border ${getPriorityStyles(
                        task.priority.name,
                      )}`}
                    >
                      Приоритет: {translatePriorityName(task.priority.name)}
                    </span>
                  )}

                  {task.complexity && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs border ${getComplexityStyles(
                        task.complexity.name,
                      )}`}
                    >
                      Сложность: {translateComplexityName(task.complexity.name)}
                      {typeof task.complexity.pointsValue === 'number'
                        ? ` · ${task.complexity.pointsValue} балл.`
                        : ''}
                    </span>
                  )}

                  {task.requiresReport && (
                    <span className="px-2.5 py-1 rounded-full text-xs border bg-violet-950/40 text-violet-300 border-violet-900/50">
                      Отчёт: {translateReportType(task.reportType)}
                    </span>
                  )}

                  {task.requiresReport && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs border ${getReportStatusStyles(
                        task.latestReportStatus,
                      )}`}
                    >
                      Статус отчёта: {translateReportStatus(task.latestReportStatus)}
                    </span>
                  )}

                  {task.dueDate && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs border ${
                        overdue
                          ? 'bg-red-950/30 text-red-300 border-red-900/50'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-700'
                      }`}
                    >
                      Дедлайн: {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-neutral-700 space-y-3">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-neutral-500 mb-2">
                    Изменить статус
                  </label>

                  <select
                    value={task.status.id}
                    onChange={(e) => onStatusChange(task.id, e.target.value)}
                    className="w-full bg-neutral-700 border border-neutral-600 rounded-xl px-3 py-2.5 outline-none focus:border-white text-sm"
                  >
                    {statuses.map((status) => {
                      const disabled = isDoneStatusLocked(
                        task,
                        status.name,
                        isMemberView,
                      );

                      return (
                        <option key={status.id} value={status.id} disabled={disabled}>
                          {translateStatusName(status.name)}
                          {disabled ? ' — требуется подтверждённый отчёт' : ''}
                        </option>
                      );
                    })}
                  </select>

                  {isMemberView &&
                    task.requiresReport &&
                    task.latestReportStatus !== 'APPROVED' && (
                      <p className="mt-2 text-xs text-amber-400">
                        Перевод в статус «Выполнено» будет доступен после принятия
                        отчёта руководителем.
                      </p>
                    )}
                </div>

                {(onEditTask || onDeleteTask) && (
                  <div className="grid grid-cols-1 gap-2">
                    {onEditTask && (
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        className="w-full bg-neutral-900 border border-neutral-700 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-neutral-700 transition"
                      >
                        Редактировать
                      </button>
                    )}

                    {onDeleteTask && (
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task)}
                        className="w-full bg-red-950/30 border border-red-900/50 text-red-300 px-4 py-2.5 rounded-xl font-medium hover:bg-red-900/30 transition"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className={styles.empty}>
            <p className="text-sm">Пока нет задач</p>
            <p className="text-xs mt-2 text-neutral-500">
              Создайте задачу или переместите её сюда
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
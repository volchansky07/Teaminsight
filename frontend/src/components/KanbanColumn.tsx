'use client';

import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  requiresReport?: boolean;
  reportType?: 'TEXT' | 'LINK' | 'FILE' | 'IMAGE' | null;
  latestReportStatus?: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | null;
  completedAt?: string | null;
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
  currentUserId?: string;
  onOpenReportModal?: (task: Task) => void;
  onOpenReportsPage?: () => void;
  latestReportsByTaskId?: Record<string, any>;
  onOpenReviewModal?: (task: Task) => void;
  onArchiveTask?: (task: Task) => void;
}

function getColumnStyles(title: string) {
  switch (title) {
    case 'К выполнению':
      return {
        wrapper:
          'bg-neutral-900 border border-sky-900/60 rounded-3xl p-5 min-h-[500px] shadow',
        badge:
          'px-3 py-1 rounded-full bg-sky-950/60 text-sky-300 text-sm border border-sky-900/70',
        empty:
          'border border-dashed border-sky-900/50 rounded-2xl p-8 text-center text-sky-200/70 bg-sky-950/20',
      };
    case 'В работе':
      return {
        wrapper:
          'bg-neutral-900 border border-amber-900/60 rounded-3xl p-5 min-h-[500px] shadow',
        badge:
          'px-3 py-1 rounded-full bg-amber-950/60 text-amber-300 text-sm border border-amber-900/70',
        empty:
          'border border-dashed border-amber-900/50 rounded-2xl p-8 text-center text-amber-200/70 bg-amber-950/20',
      };
    case 'Выполнено':
      return {
        wrapper:
          'bg-neutral-900 border border-emerald-900/60 rounded-3xl p-5 min-h-[500px] shadow',
        badge:
          'px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-300 text-sm border border-emerald-900/70',
        empty:
          'border border-dashed border-emerald-900/50 rounded-2xl p-8 text-center text-emerald-200/70 bg-emerald-950/20',
      };
    default:
      return {
        wrapper:
          'bg-neutral-900 border border-neutral-800 rounded-3xl p-5 min-h-[500px] shadow',
        badge:
          'px-3 py-1 rounded-full bg-neutral-800 text-neutral-300 text-sm border border-neutral-700',
        empty:
          'border border-dashed border-neutral-700 rounded-2xl p-8 text-center text-neutral-500',
      };
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
      return 'bg-red-950/40 text-red-300 border-red-900/50';
    case 'medium':
      return 'bg-amber-950/40 text-amber-300 border-amber-900/50';
    case 'low':
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

function shouldShowManagerReportButton(task: Task, isMemberView: boolean) {
  return !isMemberView && !!task.requiresReport && !!task.latestReportStatus;
}

function canManagerEditTask(title: string) {
  return title === 'К выполнению' || title === 'В работе';
}

function canManagerDeleteTask(isMemberView: boolean) {
  return !isMemberView;
}

function canManagerArchiveTask(title: string, isMemberView: boolean) {
  return !isMemberView && title === 'Выполнено';
}

function formatDate(dateString?: string | null) {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('ru-RU');
}

function isOverdue(task: Task) {
  if (!task.dueDate) return false;
  if (task.status.name === 'Done') return false;
  return new Date(task.dueDate).getTime() < new Date().getTime();
}

function shouldShowTakeInWorkButton(
  task: Task,
  isMemberView: boolean,
  currentUserId?: string,
) {
  return (
    isMemberView &&
    task.status.name === 'Todo' &&
    task.assignee?.id === currentUserId
  );
}

function shouldShowReportButton(
  task: Task,
  isMemberView: boolean,
  currentUserId?: string,
) {
  return (
    isMemberView &&
    task.requiresReport &&
    task.status.name === 'In Progress' &&
    task.assignee?.id === currentUserId &&
    !!task.reportType
  );
}

function getReportActionLabel(status?: string | null) {
  switch (status) {
    case 'REJECTED':
      return 'Исправить отчёт';
    case 'SUBMITTED':
    case 'APPROVED':
      return 'Открыть отчёт';
    default:
      return 'Отправить отчёт';
  }
}

function getInProgressStatusId(statuses: StatusItem[]) {
  return statuses.find((status) => status.name === 'In Progress')?.id ?? '';
}

export default function KanbanColumn({
  title,
  tasks,
  statuses,
  onStatusChange,
  onEditTask,
  onDeleteTask,
  isMemberView = false,
  currentUserId,
  onOpenReportModal,
  onOpenReportsPage,
  onOpenReviewModal,
  onArchiveTask,
}: Props) {
  const styles = getColumnStyles(title);
  const inProgressStatusId = getInProgressStatusId(statuses);
  const [collapsedTasks, setCollapsedTasks] = useState<Record<string, boolean>>(
    {},
  );

  const toggleTaskCollapsed = (taskId: string) => {
    setCollapsedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  return (
    <div className={styles.wrapper}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-neutral-400">
            {tasks.length === 0
              ? 'В этой колонке пока нет задач'
              : `${tasks.length} ${tasks.length === 1 ? 'задача' : 'задач'}`}
          </p>
        </div>

        <div className={styles.badge}>{tasks.length}</div>
      </div>

      {tasks.length === 0 ? (
        <div className={styles.empty}>
          <div className="text-lg font-medium">Пока нет задач</div>
          <div className="mt-2 text-sm text-inherit/80">
            Создайте задачу или дождитесь появления задач в этой колонке
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const overdue = isOverdue(task);
            const isCollapsed = !!collapsedTasks[task.id];

            const showManagerReportButton =
              shouldShowManagerReportButton(task, isMemberView) &&
              !!onOpenReviewModal;
            const showEditButton = canManagerEditTask(title) && !!onEditTask;
            const showHideButton =
              canManagerDeleteTask(isMemberView) && !!onDeleteTask;
            const showArchiveButton =
              canManagerArchiveTask(title, isMemberView) && !!onArchiveTask;

            return (
              <div
                key={task.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-5 shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <h3 className="break-words text-lg font-semibold text-white">
                        {task.title}
                      </h3>

                      {overdue ? (
                        <span className="shrink-0 rounded-full border border-red-900/50 bg-red-950/40 px-3 py-1 text-xs font-medium text-red-300">
                          Просрочено
                        </span>
                      ) : null}
                    </div>

                    {!isCollapsed && task.description ? (
                      <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                        {task.description}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleTaskCollapsed(task.id)}
                    className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                    title={
                      isCollapsed ? 'Развернуть задачу' : 'Свернуть задачу'
                    }
                  >
                    {isCollapsed ? '▾' : '▴'}
                  </button>
                </div>

                {!isCollapsed && (
                  <>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
                        Исполнитель: {task.assignee?.fullName ?? 'Не назначен'}
                      </span>

                      {task.priority ? (
                        <span
                          className={`rounded-full border px-3 py-1 ${getPriorityStyles(task.priority.name)}`}
                        >
                          Приоритет: {translatePriorityName(task.priority.name)}
                        </span>
                      ) : null}

                      {task.complexity ? (
                        <span
                          className={`rounded-full border px-3 py-1 ${getComplexityStyles(task.complexity.name)}`}
                        >
                          Сложность: {translateComplexityName(task.complexity.name)}
                          {typeof task.complexity.pointsValue === 'number'
                            ? ` · ${task.complexity.pointsValue} балл.`
                            : ''}
                        </span>
                      ) : null}

                      {task.requiresReport ? (
                        <span className="rounded-full border border-sky-900/50 bg-sky-950/40 px-3 py-1 text-sky-300">
                          Отчёт: {translateReportType(task.reportType)}
                        </span>
                      ) : null}

                      {task.requiresReport ? (
                        <span
                          className={`rounded-full border px-3 py-1 ${getReportStatusStyles(task.latestReportStatus)}`}
                        >
                          Статус отчёта: {translateReportStatus(task.latestReportStatus)}
                        </span>
                      ) : null}

                      {task.dueDate ? (
                        <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
                          Дедлайн: {formatDate(task.dueDate)}
                        </span>
                      ) : null}

                      {task.completedAt && title === 'Выполнено' ? (
                        <span className="rounded-full border border-emerald-900/50 bg-emerald-950/40 px-3 py-1 text-emerald-300">
                          Дата выполнения: {formatDate(task.completedAt)}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 rounded-2xl border border-white/5 bg-black/20 p-4">
                      <div className="text-sm font-medium text-neutral-300">
                        Статус задачи
                      </div>
                      <div className="mt-2 text-base text-white">{title}</div>

                      {title === 'К выполнению' ? (
                        <p className="mt-2 text-xs text-neutral-400">
                          Задача ожидает, пока назначенный сотрудник возьмёт её в работу.
                        </p>
                      ) : null}

                      {title === 'В работе' && task.requiresReport ? (
                        <p className="mt-2 text-xs text-amber-300">
                          После принятия отчёта руководителем задача автоматически перейдёт в статус «Выполнено».
                        </p>
                      ) : null}

                      {title === 'Выполнено' ? (
                        <p className="mt-2 text-xs text-emerald-300">
                          Задача завершена и закрыта по бизнес-процессу проекта.
                        </p>
                      ) : null}
                    </div>

                    {shouldShowTakeInWorkButton(
                      task,
                      isMemberView,
                      currentUserId,
                    ) ? (
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            if (!inProgressStatusId) return;
                            onStatusChange(task.id, inProgressStatusId);
                          }}
                          className="w-full rounded-xl border border-amber-900/50 bg-amber-950/40 px-4 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-900/40"
                        >
                          Взять в работу
                        </button>
                      </div>
                    ) : null}

                    {shouldShowReportButton(
                      task,
                      isMemberView,
                      currentUserId,
                    ) ? (
                      <div className="mt-4 flex flex-col gap-2">
                        <button
                          onClick={() => {
                            if (
                              task.latestReportStatus === 'SUBMITTED' ||
                              task.latestReportStatus === 'APPROVED'
                            ) {
                              onOpenReportsPage?.();
                              return;
                            }

                            onOpenReportModal?.(task);
                          }}
                          className="w-full rounded-xl border border-sky-900/50 bg-sky-950/40 px-4 py-2.5 text-sm font-medium text-sky-300 transition hover:bg-sky-900/40"
                        >
                          {getReportActionLabel(task.latestReportStatus)}
                        </button>

                        {task.latestReportStatus === 'SUBMITTED' ? (
                          <p className="text-xs text-neutral-400">
                            Отчёт уже отправлен и ожидает проверки руководителем.
                          </p>
                        ) : null}

                        {task.latestReportStatus === 'REJECTED' ? (
                          <p className="text-xs text-red-300">
                            Отчёт отклонён. Исправьте его и отправьте повторно.
                          </p>
                        ) : null}

                        {task.latestReportStatus === 'APPROVED' ? (
                          <p className="text-xs text-emerald-300">
                            Отчёт принят. Задача будет закрыта автоматически.
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {!isMemberView ? (
                      <div className="mt-4 space-y-3">
                        {showManagerReportButton ? (
                          <button
                            onClick={() => onOpenReviewModal?.(task)}
                            className="w-full rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-900/30"
                          >
                            Посмотреть отчёт
                          </button>
                        ) : null}

                        {(title === 'К выполнению' || title === 'В работе') &&
                        (showEditButton || showHideButton) ? (
                          <div className="grid grid-cols-2 gap-3">
                            {showEditButton ? (
                              <button
                                onClick={() => onEditTask?.(task)}
                                className="flex h-[48px] w-full items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 px-4 text-center font-medium text-white transition hover:bg-neutral-700"
                              >
                                Редактировать
                              </button>
                            ) : null}

                            {showHideButton ? (
                              <button
                                onClick={() => onDeleteTask?.(task)}
                                className="flex h-[48px] w-full items-center justify-center rounded-xl border border-red-900/50 bg-red-950/30 px-4 text-center font-medium text-red-300 transition hover:bg-red-900/30"
                              >
                                Скрыть
                              </button>
                            ) : null}
                          </div>
                        ) : null}

                        {title === 'Выполнено' &&
                        (showHideButton || showArchiveButton) ? (
                          <div className="grid grid-cols-2 gap-3">
                            {showHideButton ? (
                              <button
                                onClick={() => onDeleteTask?.(task)}
                                className="flex h-[48px] w-full items-center justify-center rounded-xl border border-red-900/50 bg-red-950/30 px-4 text-center font-medium text-red-300 transition hover:bg-red-900/30"
                              >
                                Скрыть
                              </button>
                            ) : null}

                            {showArchiveButton ? (
                              <button
                                onClick={() => onArchiveTask?.(task)}
                                className="flex h-[48px] w-full items-center justify-center rounded-xl border border-sky-900/50 bg-sky-950/30 px-4 text-center font-medium text-sky-300 transition hover:bg-sky-900/30"
                              >
                                Архивировать
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/services/api';
import AppHeader from '@/components/AppHeader';
import InlineNotice from '@/components/InlineNotice';

type NotificationType =
  | 'REPORT_SUBMITTED'
  | 'REPORT_APPROVED'
  | 'REPORT_REJECTED'
  | 'TASK_ASSIGNED';

type NotificationEntityType = 'TASK' | 'REPORT' | 'PROJECT' | null;

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  entityType?: NotificationEntityType;
  entityId?: string | null;
  projectId?: string | null;
  createdAt: string;
  project?: {
    id: string;
    name: string;
  } | null;
}

interface NoticeState {
  type: 'success' | 'error';
  message: string;
}

type FilterType = 'all' | 'unread' | 'read';

function formatDateTime(dateString?: string | null) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('ru-RU');
}

function getNotificationTypeLabel(type: NotificationType) {
  switch (type) {
    case 'REPORT_SUBMITTED':
      return 'Новый отчёт';
    case 'REPORT_APPROVED':
      return 'Отчёт принят';
    case 'REPORT_REJECTED':
      return 'Отчёт отклонён';
    case 'TASK_ASSIGNED':
      return 'Назначена задача';
    default:
      return 'Уведомление';
  }
}

function getNotificationTypeStyles(type: NotificationType) {
  switch (type) {
    case 'REPORT_SUBMITTED':
      return 'border-amber-900/50 bg-amber-950/30 text-amber-300';
    case 'REPORT_APPROVED':
      return 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300';
    case 'REPORT_REJECTED':
      return 'border-red-900/50 bg-red-950/30 text-red-300';
    case 'TASK_ASSIGNED':
      return 'border-sky-900/50 bg-sky-950/30 text-sky-300';
    default:
      return 'border-neutral-700 bg-neutral-900 text-neutral-300';
  }
}

function getNotificationLink(notification: NotificationItem) {
  if (notification.projectId) {
    switch (notification.type) {
      case 'REPORT_SUBMITTED':
      case 'REPORT_APPROVED':
      case 'REPORT_REJECTED':
        return `/projects/${notification.projectId}/reports`;
      case 'TASK_ASSIGNED':
        return `/projects/${notification.projectId}/dashboard`;
      default:
        return `/projects/${notification.projectId}/dashboard`;
    }
  }

  return '/projects';
}

function NotificationCard({
  notification,
  onMarkRead,
}: {
  notification: NotificationItem;
  onMarkRead: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const link = getNotificationLink(notification);

  return (
    <div
      className={[
        'rounded-[28px] border p-6 transition-all',
        notification.isRead
          ? 'border-white/8 bg-[#141414]'
          : 'border-white/12 bg-[#171717] shadow-[0_12px_40px_rgba(0,0,0,0.35)]',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="break-words text-2xl font-semibold text-white">
              {notification.title}
            </h2>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${getNotificationTypeStyles(
                notification.type,
              )}`}
            >
              {getNotificationTypeLabel(notification.type)}
            </span>

            {!notification.isRead ? (
              <span className="rounded-full border border-violet-900/50 bg-violet-950/30 px-3 py-1 text-xs font-medium text-violet-300">
                Новое
              </span>
            ) : null}
          </div>

          {!expanded ? (
            <p className="mt-4 text-white/60">{notification.message}</p>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="whitespace-pre-wrap break-words text-white/75">
                {notification.message}
              </p>

              <div className="flex flex-wrap gap-2 text-xs">
                {notification.project?.name ? (
                  <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
                    Проект:{' '}
                    <span className="text-white">{notification.project.name}</span>
                  </span>
                ) : null}

                <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
                  Дата:{' '}
                  <span className="text-white">
                    {formatDateTime(notification.createdAt)}
                  </span>
                </span>

                <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
                  Статус:{' '}
                  <span className="text-white">
                    {notification.isRead ? 'Прочитано' : 'Не прочитано'}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
          title={expanded ? 'Свернуть' : 'Развернуть'}
        >
          {expanded ? '▴' : '▾'}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={link}
          className="rounded-[18px] border border-emerald-900/50 bg-emerald-950/30 px-5 py-3 font-medium text-emerald-300 transition hover:bg-emerald-900/30"
        >
          Перейти
        </Link>

        {!notification.isRead ? (
          <button
            type="button"
            onClick={() => onMarkRead(notification.id)}
            className="rounded-[18px] border border-sky-900/50 bg-sky-950/30 px-5 py-3 font-medium text-sky-300 transition hover:bg-sky-900/30"
          >
            Отметить как прочитанное
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications/my');
      setNotifications(res.data ?? []);
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
      setNotice({
        type: 'error',
        message: 'Не удалось загрузить уведомления.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.isRead).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return notifications.filter((item) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'unread' && !item.isRead) ||
        (filter === 'read' && item.isRead);

      const matchesSearch =
        !normalizedSearch ||
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.message.toLowerCase().includes(normalizedSearch) ||
        (item.project?.name ?? '').toLowerCase().includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [notifications, filter, search]);

  const handleMarkRead = async (id: string) => {
    try {
      setNotice(null);
      await api.patch(`/notifications/${id}/read`);

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isRead: true } : item,
        ),
      );
    } catch (error) {
      console.error('Ошибка отметки уведомления:', error);
      setNotice({
        type: 'error',
        message: 'Не удалось отметить уведомление как прочитанное.',
      });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      setNotice(null);

      await api.patch('/notifications/read-all');

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
        })),
      );

      setNotice({
        type: 'success',
        message: 'Все уведомления отмечены как прочитанные.',
      });
    } catch (error) {
      console.error('Ошибка массовой отметки уведомлений:', error);
      setNotice({
        type: 'error',
        message: 'Не удалось отметить все уведомления как прочитанные.',
      });
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />

      <main className="mx-auto max-w-[1600px] px-8 py-10">
        <section className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.2em] text-white/35">
              СИСТЕМНЫЙ ЦЕНТР
            </p>
            <h1 className="text-6xl font-semibold leading-[0.95] text-white">
              Уведомления
            </h1>
            <p className="mt-4 max-w-[820px] text-xl leading-relaxed text-white/55">
              Отслеживайте ключевые события платформы: новые отчёты,
              результаты проверки и назначения задач.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[#141414] px-6 py-5">
            <div className="text-sm uppercase tracking-[0.18em] text-white/35">
              Непрочитанные
            </div>
            <div className="mt-3 text-5xl font-semibold text-white">
              {unreadCount}
            </div>
          </div>
        </section>

        {notice && <InlineNotice type={notice.type} message={notice.message} />}

        <section className="mb-8 rounded-[32px] border border-white/10 bg-[#141414] p-7 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
          <div className="mb-6">
            <h2 className="text-3xl font-semibold text-white">
              Поиск и фильтрация уведомлений
            </h2>
            <p className="mt-2 text-white/55">
              Быстро находите нужные уведомления по заголовку, тексту и проекту.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px_auto]">
            <div>
              <label className="mb-2 block text-sm text-white/60">Поиск</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="По заголовку, тексту или названию проекта"
                className="w-full rounded-[20px] border border-white/10 bg-[#1a1a1a] px-5 py-4 text-white outline-none transition placeholder:text-white/25 focus:border-white/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/60">Статус</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterType)}
                className="w-full rounded-[20px] border border-white/10 bg-[#1a1a1a] px-5 py-4 text-white outline-none transition focus:border-white/20"
              >
                <option value="all">Все</option>
                <option value="unread">Только непрочитанные</option>
                <option value="read">Только прочитанные</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll || unreadCount === 0}
                className="w-full rounded-[20px] border border-white/10 bg-white/5 px-5 py-4 font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 xl:w-auto"
              >
                {markingAll ? 'Обновление...' : 'Прочитать все'}
              </button>
            </div>
          </div>

          <div className="mt-5 text-sm text-white/45">
            Найдено уведомлений:{' '}
            <span className="text-white">{filteredNotifications.length}</span>
          </div>
        </section>

        {loading ? (
          <section className="rounded-[32px] border border-white/10 bg-[#141414] p-10 text-lg text-white/70">
            Загрузка уведомлений...
          </section>
        ) : filteredNotifications.length === 0 ? (
          <section className="rounded-[32px] border border-white/10 bg-[#141414] p-12 text-center shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
            <h2 className="text-3xl font-semibold text-white">
              Уведомлений пока нет
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/55">
              Когда в системе появятся важные события, они будут отображаться
              здесь.
            </p>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-6">
            {filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
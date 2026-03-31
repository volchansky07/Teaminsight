'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSectionCard from '@/components/admin/AdminSectionCard';
import AdminGuard from '@/components/admin/AdminGuard';
import InlineNotice from '@/components/InlineNotice';
import CreateOrganizationModal from '@/components/admin/CreateOrganizationModal';

interface OrganizationItem {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  _count?: {
    users: number;
    projects: number;
  };
}

interface NoticeState {
  type: 'success' | 'error';
  message: string;
}

export default function AdminOrganizationsPage() {
  const [items, setItems] = useState<OrganizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadOrganizations = async () => {
    try {
      const res = await api.get('/admin/organizations');
      setItems(res.data ?? []);
    } catch (error) {
      console.error(error);
      setNotice({
        type: 'error',
        message: 'Не удалось загрузить список организаций.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const toggleActive = async (id: string) => {
    try {
      await api.patch(`/admin/organizations/${id}/toggle-active`);
      await loadOrganizations();
    } catch (error) {
      console.error(error);
      setNotice({
        type: 'error',
        message: 'Не удалось изменить статус организации.',
      });
    }
  };

    return (
    <AdminGuard>
        <div className="min-h-screen bg-black text-white">
        <AdminHeader />

        <main className="mx-auto max-w-[1600px] px-8 py-10">
            <div className="mb-8">
            <p className="text-[13px] uppercase tracking-[0.22em] text-white/40">
                Администрирование
            </p>
            <h1 className="mt-3 text-6xl font-semibold leading-[0.95] text-white">
                Организации
            </h1>
            <p className="mt-4 max-w-[900px] text-lg leading-relaxed text-white/55">
                Управление организациями, их статусами и структурой использования платформы.
            </p>
            </div>

            {notice ? <InlineNotice type={notice.type} message={notice.message} /> : null}

            <AdminSectionCard
            title="Список организаций"
            subtitle="Добавляйте, просматривайте и активируйте организации."
            action={
                <button
                onClick={() => setShowCreate(true)}
                className="rounded-2xl bg-white px-5 py-3 font-medium text-black transition hover:bg-neutral-200"
                >
                + Создать организацию
                </button>
            }
            >
            {loading ? (
                <div className="text-white/60">Загрузка...</div>
            ) : items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-white/45">
                Организаций пока нет.
                </div>
            ) : (
                <div className="space-y-4">
                {items.map((item) => (
                    <div
                    key={item.id}
                    className="rounded-[24px] border border-white/8 bg-black/20 p-5"
                    >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                        <h3 className="text-2xl font-semibold text-white">{item.name}</h3>
                        <p className="mt-2 max-w-[900px] text-sm text-white/55">
                            {item.description?.trim() || 'Описание отсутствует.'}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/55">
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                            Пользователи: {item._count?.users ?? 0}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                            Проекты: {item._count?.projects ?? 0}
                            </span>
                            <span
                            className={[
                                'rounded-full px-3 py-1.5',
                                item.isActive
                                ? 'border border-emerald-900/40 bg-emerald-950/20 text-emerald-300'
                                : 'border border-amber-900/40 bg-amber-950/20 text-amber-300',
                            ].join(' ')}
                            >
                            {item.isActive ? 'Активна' : 'Деактивирована'}
                            </span>
                        </div>
                        </div>

                        <div>
                        <button
                            onClick={() => toggleActive(item.id)}
                            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-white/80 transition hover:bg-white/10 hover:text-white"
                        >
                            {item.isActive ? 'Деактивировать' : 'Активировать'}
                        </button>
                        </div>
                    </div>
                    </div>
                ))}
                </div>
            )}
            </AdminSectionCard>
        </main>

        <CreateOrganizationModal
            isOpen={showCreate}
            onClose={() => setShowCreate(false)}
            onCreated={loadOrganizations}
        />
        </div>
    </AdminGuard>
    );
}
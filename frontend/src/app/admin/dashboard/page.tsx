'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminSectionCard from '@/components/admin/AdminSectionCard';
import AdminGuard  from '@/components/admin/AdminGuard';
import InlineNotice from '@/components/InlineNotice';

interface DashboardSummary {
  organizationsTotal: number;
  activeOrganizations: number;
  usersTotal: number;
  activeUsers: number;
  inactiveUsers: number;
  superAdmins: number;
  activeProjects: number;
}

interface NoticeState {
  type: 'success' | 'error';
  message: string;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/admin/dashboard');
        setData(res.data);
      } catch (error) {
        console.error(error);
        setNotice({
          type: 'error',
          message: 'Не удалось загрузить обзор системы.',
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

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
                Системный обзор
            </h1>
            <p className="mt-4 max-w-[900px] text-lg leading-relaxed text-white/55">
                Централизованное управление организациями, пользователями и общей
                структурой платформы.
            </p>
            </div>

            {notice ? <InlineNotice type={notice.type} message={notice.message} /> : null}

            {loading ? (
            <div className="rounded-[30px] border border-white/10 bg-[#141414] p-10 text-lg text-white/70">
                Загрузка данных...
            </div>
            ) : data ? (
            <div className="space-y-8">
                <section className="grid grid-cols-1 gap-6 xl:grid-cols-4">
                <AdminStatCard
                    label="Организации"
                    value={data.organizationsTotal}
                    description="Общее количество организаций в системе."
                />
                <AdminStatCard
                    label="Активные пользователи"
                    value={data.activeUsers}
                    description="Количество пользователей с активным доступом."
                    accentClass="text-emerald-300"
                />
                <AdminStatCard
                    label="Деактивированные"
                    value={data.inactiveUsers}
                    description="Пользователи, временно отключённые от системы."
                    accentClass="text-amber-300"
                />
                <AdminStatCard
                    label="Активные проекты"
                    value={data.activeProjects}
                    description="Количество проектов, доступных для работы."
                    accentClass="text-sky-300"
                />
                </section>

                <AdminSectionCard
                title="Сводка по системе"
                subtitle="Ключевые показатели для контроля административной структуры платформы."
                >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
                    <div className="text-sm text-white/45">Всего пользователей</div>
                    <div className="mt-3 text-3xl font-semibold text-white">
                        {data.usersTotal}
                    </div>
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
                    <div className="text-sm text-white/45">Активные организации</div>
                    <div className="mt-3 text-3xl font-semibold text-emerald-300">
                        {data.activeOrganizations}
                    </div>
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
                    <div className="text-sm text-white/45">Супер-администраторы</div>
                    <div className="mt-3 text-3xl font-semibold text-sky-300">
                        {data.superAdmins}
                    </div>
                    </div>
                </div>
                </AdminSectionCard>
            </div>
            ) : (
            <div className="rounded-[30px] border border-white/10 bg-[#141414] p-10 text-lg text-white/70">
                Данные пока недоступны.
            </div>
            )}
        </main>
        </div>
    </AdminGuard>
    );
}
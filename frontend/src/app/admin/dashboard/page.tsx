'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminSectionCard from '@/components/admin/AdminSectionCard';
import AdminGuard from '@/components/admin/AdminGuard';
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
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6 lg:px-8">
          <AdminHeader />

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 md:p-6">
            <div className="flex flex-col gap-3">
              <span className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">
                Администрирование
              </span>

              <div>
                <h1 className="text-2xl font-semibold md:text-3xl">
                  Системный обзор
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-300 md:text-base">
                  Централизованное управление организациями, пользователями и
                  общей структурой платформы.
                </p>
              </div>
            </div>
          </section>

          {notice ? <InlineNotice type={notice.type} message={notice.message} /> : null}

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
              Загрузка данных...
            </div>
          ) : data ? (
            <>
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <AdminStatCard
                  label="Всего пользователей"
                  value={data.usersTotal}
                  description="Общее количество зарегистрированных пользователей."
                />
                <AdminStatCard
                  label="Активные организации"
                  value={data.activeOrganizations}
                  description="Организации, которые сейчас используют платформу."
                />
                <AdminStatCard
                  label="Супер-администраторы"
                  value={data.superAdmins}
                  description="Пользователи с максимальным уровнем системного доступа."
                />
              </section>

              <section>
                <AdminSectionCard
                  title="Краткая сводка"
                  subtitle="Ключевые показатели платформы в компактном формате."
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                      <div className="text-sm text-slate-400">Всего организаций</div>
                      <div className="mt-2 text-2xl font-semibold">
                        {data.organizationsTotal}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                      <div className="text-sm text-slate-400">Активные пользователи</div>
                      <div className="mt-2 text-2xl font-semibold">
                        {data.activeUsers}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                      <div className="text-sm text-slate-400">Неактивные пользователи</div>
                      <div className="mt-2 text-2xl font-semibold">
                        {data.inactiveUsers}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                      <div className="text-sm text-slate-400">Активные проекты</div>
                      <div className="mt-2 text-2xl font-semibold">
                        {data.activeProjects}
                      </div>
                    </div>
                  </div>
                </AdminSectionCard>
              </section>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
              Данные пока недоступны.
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}
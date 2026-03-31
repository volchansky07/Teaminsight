'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/services/api';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSectionCard from '@/components/admin/AdminSectionCard';
import InlineNotice from '@/components/InlineNotice';
import CreateUserModal from '@/components/admin/CreateUserModal';

interface UserItem {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  SystemRole: 'USER' | 'SUPER_ADMIN';
  createdAt: string;
  organization?: {
    id: string;
    name: string;
  } | null;
  role?: {
    id: string;
    name: string;
  } | null;
}

interface OrganizationItem {
  id: string;
  name: string;
  isActive: boolean;
}

interface NoticeState {
  type: 'success' | 'error';
  message: string;
}

interface ResetPasswordResponse {
  user: {
    id: string;
    fullName: string;
    email: string;
  };
  tempPassword: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const [showCreate, setShowCreate] = useState(false);

  const [search, setSearch] = useState('');
  const [systemRoleFilter, setSystemRoleFilter] = useState<'ALL' | 'USER' | 'SUPER_ADMIN'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [organizationFilter, setOrganizationFilter] = useState('ALL');

  const [resetPasswordResult, setResetPasswordResult] =
    useState<ResetPasswordResponse | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);

      const [usersRes, organizationsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/organizations'),
      ]);

      setUsers(usersRes.data ?? []);
      setOrganizations(organizationsRes.data ?? []);
    } catch (error) {
      console.error(error);
      setNotice({
        type: 'error',
        message: 'Не удалось загрузить пользователей.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        !search.trim() ||
        user.fullName.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());

      const matchesSystemRole =
        systemRoleFilter === 'ALL' || user.SystemRole === systemRoleFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && user.isActive) ||
        (statusFilter === 'INACTIVE' && !user.isActive);

      const matchesOrganization =
        organizationFilter === 'ALL' ||
        user.organization?.id === organizationFilter;

      return (
        matchesSearch &&
        matchesSystemRole &&
        matchesStatus &&
        matchesOrganization
      );
    });
  }, [users, search, systemRoleFilter, statusFilter, organizationFilter]);

  const handleToggleActive = async (id: string) => {
    try {
      await api.patch(`/admin/users/${id}/toggle-active`);
      await loadData();

      setNotice({
        type: 'success',
        message: 'Статус пользователя обновлён.',
      });
    } catch (error) {
      console.error(error);
      setNotice({
        type: 'error',
        message: 'Не удалось изменить статус пользователя.',
      });
    }
  };

  const handleResetPassword = async (id: string) => {
    try {
      const res = await api.patch(`/admin/users/${id}/reset-password`);
      setResetPasswordResult(res.data);

      await loadData();

      setNotice({
        type: 'success',
        message: 'Пароль пользователя успешно сброшен.',
      });
    } catch (error) {
      console.error(error);
      setNotice({
        type: 'error',
        message: 'Не удалось сбросить пароль пользователя.',
      });
    }
  };

  const handleForcePasswordChange = async (id: string) => {
    try {
      await api.patch(`/admin/users/${id}/force-password-change`);
      await loadData();

      setNotice({
        type: 'success',
        message: 'Для пользователя включена обязательная смена пароля.',
      });
    } catch (error) {
      console.error(error);
      setNotice({
        type: 'error',
        message: 'Не удалось включить обязательную смену пароля.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AdminHeader />

      <main className="mx-auto max-w-[1600px] px-8 py-10">
        <div className="mb-8">
          <p className="text-[13px] uppercase tracking-[0.22em] text-white/40">
            Администрирование
          </p>
          <h1 className="mt-3 text-6xl font-semibold leading-[0.95] text-white">
            Пользователи
          </h1>
          <p className="mt-4 max-w-[980px] text-lg leading-relaxed text-white/55">
            Управление учётными записями, системными ролями, статусами доступа и
            временными паролями пользователей платформы.
          </p>
        </div>

        {notice ? <InlineNotice type={notice.type} message={notice.message} /> : null}

        {resetPasswordResult ? (
          <div className="mb-6 rounded-[24px] border border-sky-900/40 bg-sky-950/20 p-5">
            <p className="text-sm uppercase tracking-[0.18em] text-sky-300">
              Новый временный пароль
            </p>
            <div className="mt-3 text-white/80">
              Пользователь: <span className="font-medium">{resetPasswordResult.user.fullName}</span>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-2xl font-semibold tracking-wide text-white">
              {resetPasswordResult.tempPassword}
            </div>
          </div>
        ) : null}

        <AdminSectionCard
          title="Список пользователей"
          subtitle="Просматривайте пользователей системы, фильтруйте список и управляйте доступом."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-2xl bg-white px-5 py-3 font-medium text-black transition hover:bg-neutral-200"
            >
              + Создать пользователя
            </button>
          }
        >
          <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по ФИО или e-mail"
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25"
            />

            <select
              value={systemRoleFilter}
              onChange={(e) =>
                setSystemRoleFilter(e.target.value as 'ALL' | 'USER' | 'SUPER_ADMIN')
              }
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25"
            >
              <option value="ALL">Все системные роли</option>
              <option value="USER">USER</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')
              }
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25"
            >
              <option value="ALL">Все статусы</option>
              <option value="ACTIVE">Активные</option>
              <option value="INACTIVE">Деактивированные</option>
            </select>

            <select
              value={organizationFilter}
              onChange={(e) => setOrganizationFilter(e.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25"
            >
              <option value="ALL">Все организации</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-white/60">Загрузка...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-white/45">
              Пользователи не найдены.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="rounded-[24px] border border-white/8 bg-black/20 p-5"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <h3 className="text-2xl font-semibold text-white">{user.fullName}</h3>
                      <p className="mt-2 text-sm text-white/55">{user.email}</p>

                      <div className="mt-4 flex flex-wrap gap-3 text-sm">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/70">
                          Организация: {user.organization?.name ?? 'Не указана'}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/70">
                          Роль: {user.role?.name ?? '—'}
                        </span>

                        <span className="rounded-full border border-sky-900/40 bg-sky-950/20 px-3 py-1.5 text-sky-300">
                          {user.SystemRole}
                        </span>

                        <span
                          className={[
                            'rounded-full px-3 py-1.5',
                            user.isActive
                              ? 'border border-emerald-900/40 bg-emerald-950/20 text-emerald-300'
                              : 'border border-amber-900/40 bg-amber-950/20 text-amber-300',
                          ].join(' ')}
                        >
                          {user.isActive ? 'Активен' : 'Деактивирован'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleToggleActive(user.id)}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-white/80 transition hover:bg-white/10 hover:text-white"
                      >
                        {user.isActive ? 'Деактивировать' : 'Активировать'}
                      </button>

                      <button
                        onClick={() => handleResetPassword(user.id)}
                        className="rounded-2xl border border-sky-900/40 bg-sky-950/20 px-4 py-2.5 text-sky-300 transition hover:bg-sky-900/30"
                      >
                        Сбросить пароль
                      </button>

                      <button
                        onClick={() => handleForcePasswordChange(user.id)}
                        className="rounded-2xl border border-amber-900/40 bg-amber-950/20 px-4 py-2.5 text-amber-300 transition hover:bg-amber-900/30"
                      >
                        Обязать сменить пароль
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminSectionCard>
      </main>

      <CreateUserModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={loadData}
      />
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';

interface RoleItem {
  id: string;
  name: string;
  description?: string | null;
}

interface OrganizationItem {
  id: string;
  name: string;
  isActive: boolean;
}

interface CreatedUserResponse {
  user: {
    id: string;
    fullName: string;
    email: string;
    SystemRole: 'USER' | 'SUPER_ADMIN';
    organizationId?: string | null;
    roleId: string;
  };
  tempPassword: string;
}

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const ALLOWED_ROLE_NAMES = ['OWNER', 'MANAGER', 'EMPLOYEE'];

export default function CreateUserModal({
  isOpen,
  onClose,
  onCreated,
}: CreateUserModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [systemRole, setSystemRole] = useState<'USER' | 'SUPER_ADMIN'>('USER');

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);

  const [createdUser, setCreatedUser] = useState<CreatedUserResponse | null>(null);

  useEffect(() => {
    if (!isOpen) return;

  const bootstrap = async () => {
    try {
      setBootstrapLoading(true);

      const rolesRes = await api.get('/roles');
      const orgsRes = await api.get('/admin/organizations');

      const rawRoles = Array.isArray(rolesRes.data) ? rolesRes.data : [];
      const loadedRoles: RoleItem[] = rawRoles.filter(
        (role: RoleItem) =>
          role &&
          typeof role.id === 'string' &&
          typeof role.name === 'string' &&
          ALLOWED_ROLE_NAMES.includes(role.name),
      );

      const loadedOrganizations: OrganizationItem[] = (
        Array.isArray(orgsRes.data) ? orgsRes.data : []
      ).filter((item: OrganizationItem) => item.isActive);

      setRoles(loadedRoles);
      setOrganizations(loadedOrganizations);

      if (loadedRoles.length > 0) {
        const managerRole =
          loadedRoles.find((role) => role.name === 'MANAGER') ?? loadedRoles[0];
        setRoleId(managerRole.id);
      } else {
        setRoleId('');
      }

      if (loadedOrganizations.length > 0) {
        setOrganizationId(loadedOrganizations[0].id);
      } else {
        setOrganizationId('');
      }
    } catch (error: any) {
      console.error('CREATE USER MODAL BOOTSTRAP ERROR FULL:', error);
      console.error('CREATE USER MODAL BOOTSTRAP STATUS:', error?.response?.status);
      console.error('CREATE USER MODAL BOOTSTRAP DATA:', error?.response?.data);
      console.error('CREATE USER MODAL BOOTSTRAP URL:', error?.config?.url);

      alert('Не удалось загрузить роли или организации.');
    } finally {
      setBootstrapLoading(false);
    }
  };

    bootstrap();
  }, [isOpen]);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setRoleId('');
    setOrganizationId('');
    setSystemRole('USER');
    setCreatedUser(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getRoleLabel = (roleName: string) => {
    switch (roleName) {
      case 'OWNER':
        return 'Руководитель';
      case 'MANAGER':
        return 'Менеджер';
      case 'EMPLOYEE':
        return 'Сотрудник';
      default:
        return roleName;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      alert('Введите ФИО пользователя.');
      return;
    }

    if (!email.trim()) {
      alert('Введите e-mail пользователя.');
      return;
    }

    if (!roleId) {
      alert('Выберите роль в организации.');
      return;
    }

    if (!organizationId) {
      alert('Выберите организацию.');
      return;
    }

    try {
      setLoading(true);

      console.log('CREATE USER PAYLOAD', {
        fullName: fullName.trim(),
        email: email.trim(),
        roleId,
        organizationId,
        systemRole,
      });

      const res = await api.post('/admin/users', {
        fullName: fullName.trim(),
        email: email.trim(),
        roleId,
        organizationId,
        systemRole,
      });

      setCreatedUser(res.data);
      onCreated();
    } catch (error: any) {
      console.error('Ошибка создания пользователя:', error);
      console.error('BACKEND ERROR RESPONSE:', error?.response?.data);

      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Не удалось создать пользователя.';

      alert(
        Array.isArray(backendMessage)
          ? backendMessage.join('\n')
          : backendMessage,
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-[#141414] p-6 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-white">Создать пользователя</h2>
          <p className="mt-2 text-sm text-white/55">
            Добавьте нового пользователя в систему и сразу получите временный пароль.
          </p>
        </div>

        {createdUser ? (
          <div className="space-y-5">
            <div className="rounded-[24px] border border-emerald-900/40 bg-emerald-950/20 p-5">
              <p className="text-sm uppercase tracking-[0.18em] text-emerald-300">
                Пользователь создан
              </p>
              <div className="mt-4 space-y-2 text-white/80">
                <p>
                  <span className="text-white/45">ФИО:</span> {createdUser.user.fullName}
                </p>
                <p>
                  <span className="text-white/45">E-mail:</span> {createdUser.user.email}
                </p>
                <p>
                  <span className="text-white/45">Системная роль:</span>{' '}
                  {createdUser.user.SystemRole}
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-sky-900/40 bg-sky-950/20 p-5">
              <p className="text-sm uppercase tracking-[0.18em] text-sky-300">
                Временный пароль
              </p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-2xl font-semibold tracking-wide text-white">
                {createdUser.tempPassword}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                Сохраните этот пароль. При первом входе пользователь должен будет сменить его.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-2xl bg-white px-5 py-3 font-medium text-black transition hover:bg-neutral-200"
              >
                Готово
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-white/50">ФИО</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Например, Иванов Иван Иванович"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-white/50">E-mail</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@company.local"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/50">Роль в организации</label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25"
                >
                  <option value="">Выберите роль</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {getRoleLabel(role.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/50">Организация</label>
                <select
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25"
                >
                  <option value="">Выберите организацию</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-white/50">Системная роль</label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setSystemRole('USER')}
                    className={[
                      'rounded-full px-5 py-3 text-sm font-medium transition',
                      systemRole === 'USER'
                        ? 'bg-white text-black'
                        : 'border border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white',
                    ].join(' ')}
                  >
                    USER
                  </button>

                  <button
                    type="button"
                    onClick={() => setSystemRole('SUPER_ADMIN')}
                    className={[
                      'rounded-full px-5 py-3 text-sm font-medium transition',
                      systemRole === 'SUPER_ADMIN'
                        ? 'bg-white text-black'
                        : 'border border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white',
                    ].join(' ')}
                  >
                    SUPER_ADMIN
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading || bootstrapLoading}
                className="rounded-2xl bg-white px-5 py-3 font-medium text-black transition hover:bg-neutral-200 disabled:opacity-60"
              >
                {loading ? 'Создание...' : 'Создать пользователя'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
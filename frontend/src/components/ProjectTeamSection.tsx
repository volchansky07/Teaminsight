'use client';

import { useMemo, useState } from 'react';
import InlineNotice from '@/components/InlineNotice';

interface ProjectMemberItem {
  userId: string;
  fullName: string;
  email?: string;
  roleInProject: string;
}

interface OrganizationUserItem {
  id: string;
  fullName: string;
  email: string;
  role?: {
    name: string;
  } | null;
}

interface NoticeState {
  type: 'success' | 'error';
  message: string;
}

interface Props {
  members: ProjectMemberItem[];
  organizationUsers: OrganizationUserItem[];
  onAddMember: (userId: string, roleInProject: string) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
}

function translateProjectRole(role: string) {
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

export default function ProjectTeamSection({
  members,
  organizationUsers,
  onAddMember,
  onRemoveMember,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('MEMBER');
  const [submitting, setSubmitting] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const availableUsers = useMemo(() => {
    const memberIds = new Set(members.map((member) => member.userId));
    return organizationUsers.filter((user) => !memberIds.has(user.id));
  }, [members, organizationUsers]);

  const resetForm = () => {
    setSelectedUserId('');
    setSelectedRole('MEMBER');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!selectedUserId) {
      setNotice({
        type: 'error',
        message: 'Выберите сотрудника для добавления.',
      });
      return;
    }

    try {
      setSubmitting(true);
      await onAddMember(selectedUserId, selectedRole);

      setNotice({
        type: 'success',
        message: 'Участник успешно добавлен в проект.',
      });

      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error(error);
      setNotice({
        type: 'error',
        message: 'Не удалось добавить участника в проект.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setNotice(null);

    try {
      setRemovingUserId(userId);
      await onRemoveMember(userId);

      setNotice({
        type: 'success',
        message: 'Участник удалён из проекта.',
      });
    } catch (error) {
      console.error(error);
      setNotice({
        type: 'error',
        message: 'Не удалось удалить участника из проекта.',
      });
    } finally {
      setRemovingUserId(null);
    }
  };

  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-neutral-500 text-sm uppercase tracking-[0.2em] mb-3">
            КОМАНДА ПРОЕКТА
          </p>
          <h2 className="text-3xl font-bold tracking-tight">Участники проекта</h2>
          <p className="text-neutral-400 mt-3">
            Управляйте составом команды и ролями участников внутри проекта.
          </p>
        </div>

        <button
          onClick={() => {
            if (!showForm) resetForm();
            setShowForm((prev) => !prev);
            setNotice(null);
          }}
          className="bg-white text-black px-5 py-3 rounded-2xl font-medium hover:bg-neutral-200 transition"
        >
          {showForm ? 'Закрыть' : '+ Добавить участника'}
        </button>
      </div>

      {notice && <InlineNotice type={notice.type} message={notice.message} />}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-neutral-800 border border-neutral-700 rounded-3xl p-6 space-y-5"
        >
          <div>
            <h3 className="text-xl font-semibold">Добавление участника</h3>
            <p className="text-neutral-400 mt-2 text-sm">
              Выберите сотрудника организации и назначьте ему роль в проекте.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Сотрудник
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
              >
                <option value="">Выберите сотрудника</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Роль в проекте
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
              >
                <option value="MANAGER">Менеджер</option>
                <option value="MEMBER">Сотрудник</option>
              </select>
            </div>
          </div>

          {availableUsers.length === 0 && (
            <div className="rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-400">
              Все сотрудники организации уже добавлены в проект.
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || availableUsers.length === 0}
              className="bg-white text-black px-5 py-3 rounded-2xl font-medium hover:bg-neutral-200 transition disabled:opacity-60"
            >
              {submitting ? 'Добавление...' : 'Добавить'}
            </button>

            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
                setNotice(null);
              }}
              className="bg-neutral-900 text-white px-5 py-3 rounded-2xl font-medium hover:bg-neutral-700 transition"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {members.length === 0 ? (
        <div className="border border-dashed border-neutral-700 rounded-2xl p-8 text-center text-neutral-500 bg-neutral-950/40">
          <p className="text-sm">Участников проекта пока нет</p>
          <p className="text-xs mt-2 text-neutral-600">
            Добавьте сотрудников, чтобы назначать им задачи и анализировать вклад.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {members.map((member) => {
            const isOwner = member.roleInProject === 'OWNER';

            return (
              <div
                key={member.userId}
                className="bg-neutral-800 border border-neutral-700 rounded-2xl p-5 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold break-words">
                    {member.fullName}
                  </h3>

                  <p className="text-sm text-neutral-400 mt-2 break-words">
                    {member.email ?? 'Email не указан'}
                  </p>

                  <div className="mt-4">
                    <span className="px-2.5 py-1 rounded-full text-xs bg-neutral-900 text-neutral-300 border border-neutral-700">
                      {translateProjectRole(member.roleInProject)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isOwner || removingUserId === member.userId}
                  onClick={() => handleRemove(member.userId)}
                  className="shrink-0 bg-neutral-900 border border-neutral-700 text-white px-4 py-2 rounded-2xl text-sm font-medium hover:bg-neutral-700 transition disabled:opacity-40"
                >
                  {isOwner
                    ? 'Владелец'
                    : removingUserId === member.userId
                    ? 'Удаление...'
                    : 'Удалить'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
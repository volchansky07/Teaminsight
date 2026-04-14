'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/services/api';
import AppHeader from '@/components/AppHeader';
import InlineNotice from '@/components/InlineNotice';

type ProjectRole = 'OWNER' | 'MANAGER' | 'MEMBER';

interface NoticeState {
  type: 'success' | 'error';
  message: string;
}

interface ProjectMemberItem {
  userId: string;
  fullName: string;
  email?: string;
  roleInProject: ProjectRole;
}

interface UserItem {
  id: string;
  fullName: string;
  email?: string;
}

function parseJwt(
  token: string,
): { sub?: string; org?: string; role?: string } | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function getRoleLabel(role: ProjectRole | string) {
  switch (role) {
    case 'OWNER':
      return 'Руководитель';
    case 'MANAGER':
      return 'Менеджер';
    case 'MEMBER':
      return 'Сотрудник';
    default:
      return role;
  }
}

function getRoleStyles(role: ProjectRole | string) {
  switch (role) {
    case 'OWNER':
      return {
        text: '#19d3a2',
        bg: 'rgba(25, 211, 162, 0.14)',
        border: 'rgba(25, 211, 162, 0.25)',
      };
    case 'MANAGER':
      return {
        text: '#20bdff',
        bg: 'rgba(32, 189, 255, 0.14)',
        border: 'rgba(32, 189, 255, 0.25)',
      };
    default:
      return {
        text: '#a78bfa',
        bg: 'rgba(167, 139, 250, 0.14)',
        border: 'rgba(167, 139, 250, 0.25)',
      };
  }
}

function getInitials(fullName?: string) {
  if (!fullName) return 'U';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || 'U';
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function StatCard({
  title,
  value,
  subtitle,
  accent,
  progress,
}: {
  title: string;
  value: string;
  subtitle: string;
  accent: string;
  progress: number;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#141414] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] uppercase tracking-[0.18em] text-white/45">
            {title}
          </p>
          <h3 className="mt-3 text-5xl font-semibold leading-none text-white">
            {value}
          </h3>
        </div>

        <div
          className="mt-1 h-3 w-3 rounded-full"
          style={{ backgroundColor: accent }}
        />
      </div>

      <div className="mb-4 min-h-[40px]">
        <p className="text-sm text-white/55">{subtitle}</p>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.max(0, Math.min(progress, 100))}%`,
            backgroundColor: accent,
          }}
        />
      </div>
    </div>
  );
}

function MemberCard({
  member,
  isCurrentUser,
  canManage,
  onRemove,
}: {
  member: ProjectMemberItem;
  isCurrentUser: boolean;
  canManage: boolean;
  onRemove: (userId: string) => void;
}) {
  const styles = getRoleStyles(member.roleInProject);

  return (
    <div className="rounded-[28px] border border-white/10 bg-[#141414] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0b57f0] text-lg font-semibold text-white">
            {getInitials(member.fullName)}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-semibold text-white">
                {member.fullName}
              </h3>

              {isCurrentUser && (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/70">
                  Вы
                </span>
              )}
            </div>

            <p className="mt-2 text-base text-white/55">
              {member.email || 'Email не указан'}
            </p>

            <div
              className="mt-4 inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
              style={{
                color: styles.text,
                backgroundColor: styles.bg,
                borderColor: styles.border,
              }}
            >
              {getRoleLabel(member.roleInProject)}
            </div>
          </div>
        </div>

        {canManage ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={() => onRemove(member.userId)}
              disabled={member.roleInProject === 'OWNER'}
              className="rounded-[18px] border border-[#ff6b6b]/25 bg-[#ff6b6b]/10 px-5 py-3 text-sm font-medium text-[#ff6b6b] transition hover:bg-[#ff6b6b]/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Удалить
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ProjectMembersPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const [members, setMembers] = useState<ProjectMemberItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);

  const [currentUserId, setCurrentUserId] = useState('');
  const [currentSystemRole, setCurrentSystemRole] = useState('');

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('MEMBER');

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    if (!token) return;

    const payload = parseJwt(token);
    setCurrentUserId(payload?.sub ?? '');
    setCurrentSystemRole(payload?.role ?? '');
  }, []);

  const loadData = async () => {
    try {
      const [membersRes, usersRes] = await Promise.all([
        api.get(`/projects/${projectId}/members`).catch(() => ({ data: [] })),
        api.get('/users').catch(() => ({ data: [] })),
      ]);

      const loadedMembers = Array.isArray(membersRes.data) ? membersRes.data : [];
      const loadedUsers = Array.isArray(usersRes.data) ? usersRes.data : [];

      setMembers(loadedMembers);
      setUsers(loadedUsers);
    } catch (error) {
      console.error('Ошибка загрузки участников:', error);
      setNotice({
        type: 'error',
        message: 'Не удалось загрузить участников проекта.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    loadData();
  }, [projectId]);

  const currentProjectMember = useMemo(() => {
    return members.find((member) => member.userId === currentUserId) ?? null;
  }, [members, currentUserId]);

  const currentProjectRole = currentProjectMember?.roleInProject ?? null;

  const canManageMembers = useMemo(() => {
    return (
      currentProjectRole === 'OWNER' ||
      currentProjectRole === 'MANAGER' ||
      currentSystemRole === 'admin'
    );
  }, [currentProjectRole, currentSystemRole]);

  const ownerCount = useMemo(() => {
    return members.filter((member) => member.roleInProject === 'OWNER').length;
  }, [members]);

  const managerCount = useMemo(() => {
    return members.filter((member) => member.roleInProject === 'MANAGER').length;
  }, [members]);

  const employeeCount = useMemo(() => {
    return members.filter((member) => member.roleInProject === 'MEMBER').length;
  }, [members]);

  const availableUsers = useMemo(() => {
    const memberUserIds = new Set(
      members.map((member) => member.userId).filter(Boolean),
    );

    return users.filter((user) => user?.id && !memberUserIds.has(user.id));
  }, [users, members]);

  const handleAddMember = async () => {
    if (!selectedUserId) {
      setNotice({
        type: 'error',
        message: 'Сначала выберите пользователя для добавления.',
      });
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      await api.post(`/projects/${projectId}/members`, {
        userId: selectedUserId,
        roleInProject: selectedRole,
      });

      setSelectedUserId('');
      setSelectedRole('MEMBER');

      await loadData();

      setNotice({
        type: 'success',
        message: 'Участник успешно добавлен в проект.',
      });
    } catch (error: any) {
      console.error('Ошибка добавления участника:', error);

      const serverMessage = error?.response?.data?.message;

      setNotice({
        type: 'error',
        message:
          typeof serverMessage === 'string'
            ? serverMessage
            : 'Не удалось добавить участника.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setSubmitting(true);
    setNotice(null);

    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);

      await loadData();

      setNotice({
        type: 'success',
        message: 'Участник удалён из проекта.',
      });
    } catch (error: any) {
      console.error('Ошибка удаления участника:', error);

      const serverMessage = error?.response?.data?.message;

      setNotice({
        type: 'error',
        message:
          typeof serverMessage === 'string'
            ? serverMessage
            : 'Не удалось удалить участника.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />

      <main className="mx-auto max-w-[1600px] px-8 py-10">
        <div className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3 text-sm text-white/45">
              <span>Проект</span>
              <span>›</span>
              <span className="text-white/80">Участники</span>
            </div>

            <h1 className="text-6xl font-semibold leading-[0.95] text-white">
              Участники проекта
            </h1>

            <p className="mt-4 max-w-[860px] text-xl leading-relaxed text-white/55">
              {canManageMembers
                ? 'Просматривайте состав команды, добавляйте новых участников и управляйте составом проекта.'
                : 'Просматривайте состав проектной команды, роли участников и структуру взаимодействия внутри проекта.'}
            </p>
          </div>

          <div className="flex items-center gap-4 rounded-[24px] border border-white/10 bg-[#141414] px-5 py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0b57f0] text-2xl font-semibold text-white">
              {canManageMembers ? 'TM' : 'PR'}
            </div>

            <div>
              <div className="text-2xl font-semibold text-white">
                {canManageMembers ? 'Режим управления' : 'Режим просмотра'}
              </div>
              <div className="mt-1 text-base text-white/55">
                {canManageMembers
                  ? 'Управление командой проекта'
                  : 'Доступен только просмотр участников'}
              </div>
            </div>
          </div>
        </div>

        {notice && <InlineNotice type={notice.type} message={notice.message} />}

        {loading ? (
          <div className="rounded-[28px] border border-white/10 bg-[#141414] p-10 text-lg text-white/70">
            Загрузка участников проекта...
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-4">
              <StatCard
                title="Всего участников"
                value={`${members.length}`}
                subtitle="Общий состав проектной команды"
                accent="#1da1ff"
                progress={Math.min(members.length * 10, 100)}
              />

              <StatCard
                title="Руководители"
                value={`${ownerCount}`}
                subtitle="Количество владельцев проекта"
                accent="#19d3a2"
                progress={members.length ? (ownerCount / members.length) * 100 : 0}
              />

              <StatCard
                title="Менеджеры"
                value={`${managerCount}`}
                subtitle="Участники с управленческими функциями"
                accent="#20bdff"
                progress={members.length ? (managerCount / members.length) * 100 : 0}
              />

              <StatCard
                title="Сотрудники"
                value={`${employeeCount}`}
                subtitle="Исполнители проектной команды"
                accent="#a78bfa"
                progress={members.length ? (employeeCount / members.length) * 100 : 0}
              />
            </section>

            {canManageMembers ? (
              <section className="mt-8 rounded-[32px] border border-white/10 bg-[#141414] p-7 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                <div className="mb-6">
                  <h2 className="text-4xl font-semibold text-white">
                    Добавить участника
                  </h2>
                  <p className="mt-2 text-lg text-white/55">
                    Выберите пользователя организации и назначьте ему роль в проекте.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.7fr_auto]">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="rounded-[20px] border border-white/10 bg-[#1a1a1a] px-5 py-4 text-lg text-white outline-none transition focus:border-white/20"
                  >
                    <option value="">Выберите пользователя</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.fullName}
                        {user.email ? ` — ${user.email}` : ''}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
                    className="rounded-[20px] border border-white/10 bg-[#1a1a1a] px-5 py-4 text-lg text-white outline-none transition focus:border-white/20"
                  >
                    <option value="MEMBER">Сотрудник</option>
                    <option value="MANAGER">Менеджер</option>
                    <option value="OWNER">Руководитель</option>
                  </select>

                  <button
                    onClick={handleAddMember}
                    disabled={submitting || !selectedUserId}
                    className="rounded-[20px] bg-white px-7 py-4 text-lg font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Добавить
                  </button>
                </div>

                {availableUsers.length === 0 ? (
                  <div className="mt-5 rounded-[20px] border border-white/8 bg-white/[0.03] p-4 text-base text-white/55">
                    Все доступные пользователи уже добавлены в проект.
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="mt-8 rounded-[32px] border border-white/10 bg-[#141414] p-7 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              <div className="mb-6">
                <h2 className="text-4xl font-semibold text-white">
                  Состав команды
                </h2>
                <p className="mt-2 text-lg text-white/55">
                  Список всех участников проекта и их ролей.
                </p>
              </div>

              <div className="space-y-5">
                {members.length > 0 ? (
                  members.map((member) => (
                    <MemberCard
                      key={member.userId}
                      member={member}
                      isCurrentUser={member.userId === currentUserId}
                      canManage={canManageMembers}
                      onRemove={handleRemoveMember}
                    />
                  ))
                ) : (
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-6 text-lg text-white/60">
                    В проекте пока нет участников.
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
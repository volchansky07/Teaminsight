'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/services/api';
import AppHeader from '@/components/AppHeader';
import InlineNotice from '@/components/InlineNotice';
import ProjectTeamSection from '@/components/ProjectTeamSection';

interface Member {
  id: string;
  roleInProject: 'OWNER' | 'MANAGER' | 'MEMBER';
  user: {
    id: string;
    fullName: string;
    email: string;
  };
}

interface ProjectMemberItem {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  roleInProject: 'OWNER' | 'MANAGER' | 'MEMBER';
}

interface OrganizationUser {
  id: string;
  fullName: string;
  email: string;
  role?: {
    id: string;
    name: string;
  } | null;
}

interface NoticeState {
  type: 'success' | 'error';
  message: string;
}

export default function ProjectTeamPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [organizationUsers, setOrganizationUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const loadData = async () => {
    try {
      const [membersRes, usersRes] = await Promise.all([
        api.get(`/projects/${projectId}/members`),
        api.get('/users'),
      ]);

      setMembers(membersRes.data ?? []);
      setOrganizationUsers(usersRes.data ?? []);
    } catch (error) {
      console.error('Ошибка загрузки участников проекта:', error);
      setNotice({
        type: 'error',
        message: 'Не удалось загрузить участников проекта.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (
    userId: string,
    roleInProject: string,
  ) => {
    setNotice(null);

    try {
      await api.post(`/projects/${projectId}/members`, {
        userId,
        roleInProject,
      });

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
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setNotice(null);

    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);

      await loadData();

      setNotice({
        type: 'success',
        message: 'Участник успешно удалён из проекта.',
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
    }
  };

  useEffect(() => {
    if (!projectId) return;
    loadData();
  }, [projectId]);

  const normalizedMembers = useMemo<ProjectMemberItem[]>(
    () =>
      members.map((member) => ({
        id: member.id,
        userId: member.user.id,
        fullName: member.user.fullName,
        email: member.user.email,
        roleInProject: member.roleInProject,
      })),
    [members],
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />

      <main className="max-w-[1600px] mx-auto px-8 py-10 space-y-8">
        <div>
          <p className="text-neutral-500 text-sm uppercase tracking-[0.2em] mb-3">
            КОМАНДА ПРОЕКТА
          </p>
          <h1 className="text-5xl font-bold tracking-tight">Участники</h1>
          <p className="text-neutral-400 mt-3 text-lg">
            Управляйте составом команды проекта и распределением ролей.
          </p>
        </div>

        {notice && <InlineNotice type={notice.type} message={notice.message} />}

        {loading ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10">
            Загрузка участников проекта...
          </div>
        ) : (
          <ProjectTeamSection
            projectId={projectId}
            members={normalizedMembers}
            organizationUsers={organizationUsers}
            onUpdated={loadData}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
          />
        )}
      </main>
    </div>
  );
}
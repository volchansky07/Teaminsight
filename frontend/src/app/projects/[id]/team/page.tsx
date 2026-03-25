'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!projectId) return;
    loadData();
  }, [projectId]);

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader projectId={projectId} />

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
            members={members}
            organizationUsers={organizationUsers}
            onUpdated={loadData}
          />
        )}
      </main>
    </div>
  );
}
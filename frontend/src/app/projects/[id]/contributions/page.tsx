'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/services/api';
import AppHeader from '@/components/AppHeader';
import InlineNotice from '@/components/InlineNotice';
import ContributionLeaderboard from '@/components/ContributionLeaderboard';
import type { ContributionItem } from '@/types/contribution';

interface NoticeState {
  type: 'success' | 'error';
  message: string;
}

export default function ProjectContributionsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [contributions, setContributions] = useState<ContributionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const loadData = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/contributions`);
      setContributions(res.data ?? []);
    } catch (error) {
      console.error('Ошибка загрузки вклада команды:', error);
      setNotice({
        type: 'error',
        message: 'Не удалось загрузить вклад команды.',
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
            АНАЛИТИКА КОМАНДЫ
          </p>
          <h1 className="text-5xl font-bold tracking-tight">Аналитика</h1>
          <p className="text-neutral-400 mt-3 text-lg">
            Оценивайте вклад участников проекта по задачам, срокам и общей результативности.
          </p>
        </div>

        {notice && <InlineNotice type={notice.type} message={notice.message} />}

        {loading ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10">
            Загрузка аналитики команды...
          </div>
        ) : (
          <ContributionLeaderboard items={contributions} />
        )}
      </main>
    </div>
  );
}
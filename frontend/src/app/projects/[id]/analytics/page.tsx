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
  id: string;
  roleInProject: ProjectRole;
  user: {
    id: string;
    fullName: string;
    email?: string;
  };
}

interface TaskItem {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  dueDate?: string | null;
  completedAt?: string | null;
  status?: {
    id: string;
    name: string;
  } | null;
  assignee?: {
    id: string;
    fullName: string;
    email?: string;
  } | null;
}

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

interface ContributionItem {
  userId: string;
  fullName: string;
  completedTasks: number;
  totalTasks: number;
  contributionRate: number;
}

interface ActivityPoint {
  label: string;
  completed: number;
  inProgress: number;
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

function normalizeStatusName(name?: string | null) {
  return (name || '').trim().toLowerCase();
}

function isCompletedStatus(statusName?: string | null) {
  const s = normalizeStatusName(statusName);
  return (
    s.includes('done') ||
    s.includes('completed') ||
    s.includes('заверш') ||
    s.includes('выполн')
  );
}

function isInProgressStatus(statusName?: string | null) {
  const s = normalizeStatusName(statusName);
  return (
    s.includes('progress') ||
    s.includes('working') ||
    s.includes('review') ||
    s.includes('провер') ||
    s.includes('работ') ||
    s.includes('в работе')
  );
}

function isBlockedStatus(statusName?: string | null) {
  const s = normalizeStatusName(statusName);
  return s.includes('block') || s.includes('blocked') || s.includes('заблок');
}

function formatDays(value: number) {
  if (!Number.isFinite(value)) return '0 дн.';
  return `${value.toFixed(1)} дн.`;
}

function getWeeklyActivity(tasks: TaskItem[]): ActivityPoint[] {
  const now = new Date();
  const labels: ActivityPoint[] = [];

  for (let i = 7; i >= 0; i -= 1) {
    const start = new Date(now);
    start.setDate(now.getDate() - i * 7 - 6);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setDate(now.getDate() - i * 7);
    end.setHours(23, 59, 59, 999);

    const completed = tasks.filter((task) => {
      if (!task.completedAt) return false;
      const date = new Date(task.completedAt);
      return date >= start && date <= end;
    }).length;

    const inProgress = tasks.filter((task) => {
      const createdAt = task.createdAt ? new Date(task.createdAt) : null;
      if (!createdAt) return false;

      const statusName = task.status?.name;
      return (
        createdAt >= start &&
        createdAt <= end &&
        isInProgressStatus(statusName) &&
        !isCompletedStatus(statusName)
      );
    }).length;

    labels.push({
      label: `Нед ${8 - i}`,
      completed,
      inProgress,
    });
  }

  return labels;
}

function getTaskDurationInDays(task: TaskItem) {
  if (!task.createdAt || !task.completedAt) return null;
  const created = new Date(task.createdAt).getTime();
  const completed = new Date(task.completedAt).getTime();
  if (Number.isNaN(created) || Number.isNaN(completed) || completed < created) {
    return null;
  }
  return (completed - created) / (1000 * 60 * 60 * 24);
}

function getPersonalInsights(params: {
  overdue: number;
  completionRate: number;
  avgDurationDays: number;
  inProgress: number;
}) {
  const result: Array<{
    type: 'warning' | 'info' | 'success';
    title: string;
    description: string;
  }> = [];

  if (params.overdue > 0) {
    result.push({
      type: 'warning',
      title: 'Просроченные задачи',
      description:
        'Есть задачи с нарушением дедлайна. Стоит в первую очередь закрыть просроченные элементы и пересмотреть приоритеты.',
    });
  }

  if (params.inProgress >= 5) {
    result.push({
      type: 'info',
      title: 'Высокая нагрузка',
      description:
        'Сейчас у вас много задач в работе одновременно. Для повышения эффективности стоит сократить количество параллельных задач.',
    });
  }

  if (params.completionRate >= 80) {
    result.push({
      type: 'success',
      title: 'Сильный темп выполнения',
      description:
        'Процент выполнения задач находится на высоком уровне. Это говорит о стабильной рабочей динамике.',
    });
  }

  if (result.length === 0) {
    result.push({
      type: 'info',
      title: 'Нейтральная динамика',
      description:
        'Показатели стабильны. Для усиления результата полезно увеличить долю завершённых задач и сократить время выполнения.',
    });
  }

  if (Number.isFinite(params.avgDurationDays) && params.avgDurationDays > 0 && params.avgDurationDays <= 2) {
    result.push({
      type: 'success',
      title: 'Хорошая скорость',
      description:
        'Среднее время выполнения задач находится на хорошем уровне, что положительно влияет на личную эффективность.',
    });
  }

  return result.slice(0, 3);
}

function getTeamInsights(params: {
  completionRate: number;
  overdue: number;
  membersCount: number;
  topPerformer?: string;
}) {
  const result: Array<{
    type: 'warning' | 'info' | 'success';
    title: string;
    description: string;
  }> = [];

  if (params.completionRate >= 75) {
    result.push({
      type: 'success',
      title: 'Хороший общий прогресс',
      description:
        'Команда демонстрирует высокий процент выполнения задач, что говорит о стабильном темпе реализации проекта.',
    });
  } else {
    result.push({
      type: 'warning',
      title: 'Темп выполнения можно усилить',
      description:
        'Процент завершённых задач пока недостаточно высок. Стоит пересмотреть приоритеты и загрузку участников проекта.',
    });
  }

  if (params.overdue > 0) {
    result.push({
      type: 'warning',
      title: 'Есть просроченные задачи',
      description:
        'В проекте присутствуют задачи с нарушенным сроком. Менеджеру стоит проверить причины просрочек и перераспределить нагрузку.',
    });
  }

  result.push({
    type: 'info',
    title: 'Состав команды',
    description:
      params.topPerformer
        ? `В проекте участвуют ${params.membersCount} чел. Наиболее заметный вклад сейчас показывает ${params.topPerformer}.`
        : `В проекте участвуют ${params.membersCount} чел. Рекомендуется отслеживать динамику вклада по участникам.`,
  });

  return result.slice(0, 3);
}

function getInsightStyles(type: 'warning' | 'info' | 'success') {
  switch (type) {
    case 'warning':
      return {
        bg: 'rgba(255, 107, 107, 0.14)',
        color: '#ff6b6b',
        icon: '!',
      };
    case 'success':
      return {
        bg: 'rgba(25, 211, 162, 0.14)',
        color: '#19d3a2',
        icon: '✓',
      };
    default:
      return {
        bg: 'rgba(32, 189, 255, 0.14)',
        color: '#20bdff',
        icon: '•',
      };
  }
}

function getMaxActivityValue(points: ActivityPoint[]) {
  return Math.max(...points.map((item) => item.completed + item.inProgress), 1);
}

function StatCard({
  title,
  value,
  subtitle,
  accent,
  progress,
  extra,
}: {
  title: string;
  value: string;
  subtitle: string;
  accent: string;
  progress: number;
  extra?: React.ReactNode;
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
        {extra}
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

function DistributionRow({
  label,
  value,
  color,
  max,
}: {
  label: string;
  value: number;
  color: string;
  max: number;
}) {
  const width = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-base text-white/90">{label}</span>
        </div>
        <span className="text-base font-medium text-white">{value}</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function RatingCircle({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(value, 100));

  return (
    <div className="flex items-center justify-center">
      <div
        className="relative flex h-[240px] w-[240px] items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(#ffffff ${safeValue * 3.6}deg, rgba(255,255,255,0.14) 0deg)`,
        }}
      >
        <div className="absolute flex h-[188px] w-[188px] flex-col items-center justify-center rounded-full bg-[#0b57f0]">
          <div className="text-6xl font-semibold text-white">{safeValue}</div>
          <div className="mt-2 text-sm uppercase tracking-[0.14em] text-white/70">
            из 100
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityChart({ data }: { data: ActivityPoint[] }) {
  const maxValue = getMaxActivityValue(data);

  return (
    <div className="flex h-[320px] items-end gap-4 pt-4">
      {data.map((item) => {
        const total = item.completed + item.inProgress;
        const totalHeight = (total / maxValue) * 220;
        const completedHeight = (item.completed / maxValue) * 220;
        const inProgressHeight = (item.inProgress / maxValue) * 220;

        return (
          <div
            key={item.label}
            className="flex flex-1 flex-col items-center justify-end gap-3"
          >
            <div className="flex h-[230px] w-full items-end justify-center">
              <div
                className="relative w-full max-w-[68px] overflow-hidden rounded-t-[16px] rounded-b-[12px] bg-[#cfc9ff1f]"
                style={{ height: `${Math.max(totalHeight, 26)}px` }}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t-[16px] bg-[#1da1ff]"
                  style={{ height: `${Math.max(completedHeight, 10)}px` }}
                />
                <div
                  className="absolute left-0 right-0 top-0 bg-[#cfc9ff]"
                  style={{ height: `${Math.max(inProgressHeight, 8)}px` }}
                />
              </div>
            </div>

            <span className="text-sm text-white/55">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function InsightList({
  items,
}: {
  items: Array<{
    type: 'warning' | 'info' | 'success';
    title: string;
    description: string;
  }>;
}) {
  return (
    <div className="mt-8 space-y-6">
      {items.map((item) => {
        const styles = getInsightStyles(item.type);

        return (
          <div
            key={item.title}
            className="flex gap-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-5"
          >
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-semibold"
              style={{
                backgroundColor: styles.bg,
                color: styles.color,
              }}
            >
              {styles.icon}
            </div>

            <div>
              <h3 className="text-2xl font-semibold text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-lg leading-relaxed text-white/60">
                {item.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TeamLeaderboard({
  items,
}: {
  items: ContributionItem[];
}) {
  return (
    <div className="space-y-4">
      {items.map((member, index) => (
        <div
          key={member.userId ?? `{member.fullName}-${index}`}
          className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] px-5 py-4"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg font-semibold text-black">
              {index + 1}
            </div>

            <div>
              <div className="text-xl font-semibold text-white">
                {member.fullName}
              </div>
              <div className="mt-1 text-sm text-white/50">
                Выполнено {member.completedTasks} из {member.totalTasks}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-semibold text-white">
              {member.contributionRate}%
            </div>
            <div className="mt-1 text-sm text-white/45">вклад</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProjectAnalyticsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const [currentUserId, setCurrentUserId] = useState('');
  const [currentSystemRole, setCurrentSystemRole] = useState('');

  const [members, setMembers] = useState<ProjectMemberItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [contributions, setContributions] = useState<ContributionItem[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    if (!token) return;

    const payload = parseJwt(token);
    setCurrentUserId(payload?.sub ?? '');
    setCurrentSystemRole(payload?.role ?? '');
  }, []);

  useEffect(() => {
    if (!projectId) return;

    const loadData = async () => {
      setLoading(true);
      setNotice(null);

      try {
        const [membersRes, tasksRes, dashboardRes, contributionsRes] =
          await Promise.all([
            api.get(`/projects/${projectId}/members`).catch(() => ({ data: [] })),
            api.get(`/tasks/project/${projectId}`).catch(() => ({ data: [] })),
            api.get(`/projects/${projectId}/dashboard`).catch(() => ({
              data: null,
            })),
            api.get(`/projects/${projectId}/contributions`).catch(() => ({
              data: [],
            })),
          ]);

        setMembers(membersRes.data ?? []);
        setTasks(tasksRes.data ?? []);
        setDashboard(dashboardRes.data ?? null);
        setContributions(contributionsRes.data ?? []);
      } catch (error) {
        console.error('Ошибка загрузки аналитики проекта:', error);
        setNotice({
          type: 'error',
          message: 'Не удалось загрузить аналитику проекта.',
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  const currentProjectMember = useMemo(() => {
    return members.find((member) => member.user?.id === currentUserId) ?? null;
  }, [members, currentUserId]);

  const currentProjectRole = currentProjectMember?.roleInProject ?? null;

  const isManagerView = useMemo(() => {
    return (
      currentProjectRole === 'OWNER' ||
      currentProjectRole === 'MANAGER' ||
      currentSystemRole === 'admin'
    );
  }, [currentProjectRole, currentSystemRole]);

  const myTasks = useMemo(() => {
    return tasks.filter((task) => task.assignee?.id === currentUserId);
  }, [tasks, currentUserId]);

  const personalMetrics = useMemo(() => {
    const total = myTasks.length;
    const completed = myTasks.filter((task) =>
      isCompletedStatus(task.status?.name),
    ).length;

    const inProgress = myTasks.filter((task) => {
      const statusName = task.status?.name;
      return (
        !isCompletedStatus(statusName) &&
        !isBlockedStatus(statusName) &&
        isInProgressStatus(statusName)
      );
    }).length;

    const blocked = myTasks.filter((task) =>
      isBlockedStatus(task.status?.name),
    ).length;

    const overdue = myTasks.filter((task) => {
      if (!task.dueDate) return false;
      const due = new Date(task.dueDate);
      const isDone = isCompletedStatus(task.status?.name);
      return !isDone && due.getTime() < Date.now();
    }).length;

    const completionRate =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    const completedDurations = myTasks
      .map(getTaskDurationInDays)
      .filter((value): value is number => value !== null);

    const avgDurationDays =
      completedDurations.length > 0
        ? completedDurations.reduce((acc, value) => acc + value, 0) /
          completedDurations.length
        : 0;

    const reliabilityScore = Math.max(
      0,
      Math.min(100, Math.round(((total - overdue) / Math.max(total, 1)) * 100)),
    );

    const speedScore =
      avgDurationDays > 0
        ? Math.max(50, Math.min(100, Math.round(100 - avgDurationDays * 10)))
        : 75;

    const contributionScore = completionRate;

    const rating = Math.round(
      contributionScore * 0.45 + speedScore * 0.25 + reliabilityScore * 0.3,
    );

    return {
      total,
      completed,
      inProgress,
      blocked,
      overdue,
      completionRate,
      avgDurationDays,
      reliabilityScore,
      speedScore,
      contributionScore,
      rating,
    };
  }, [myTasks]);

  const personalActivity = useMemo(() => {
    return getWeeklyActivity(myTasks);
  }, [myTasks]);

  const personalInsights = useMemo(() => {
    return getPersonalInsights({
      overdue: personalMetrics.overdue,
      completionRate: personalMetrics.completionRate,
      avgDurationDays: personalMetrics.avgDurationDays,
      inProgress: personalMetrics.inProgress,
    });
  }, [personalMetrics]);

  const teamMetrics = useMemo(() => {
    const totalTasks = dashboard?.totalTasks ?? tasks.length;
    const completedTasks =
      dashboard?.completedTasks ??
      tasks.filter((task) => isCompletedStatus(task.status?.name)).length;

    const completionRate =
      dashboard?.completionRate ??
      (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);

    const overdue = tasks.filter((task) => {
      if (!task.dueDate) return false;
      const isDone = isCompletedStatus(task.status?.name);
      return !isDone && new Date(task.dueDate).getTime() < Date.now();
    }).length;

    const inProgress = tasks.filter((task) => {
      const statusName = task.status?.name;
      return (
        !isCompletedStatus(statusName) &&
        !isBlockedStatus(statusName) &&
        isInProgressStatus(statusName)
      );
    }).length;

    const blocked = tasks.filter((task) =>
      isBlockedStatus(task.status?.name),
    ).length;

    const membersCount = members.length;

    const avgContribution =
      contributions.length > 0
        ? Math.round(
            contributions.reduce(
              (acc, item) => acc + (item.contributionRate || 0),
              0,
            ) / contributions.length,
          )
        : 0;

    const topPerformer = [...contributions].sort(
      (a, b) => b.contributionRate - a.contributionRate,
    )[0];

    return {
      totalTasks,
      completedTasks,
      completionRate,
      overdue,
      inProgress,
      blocked,
      membersCount,
      avgContribution,
      topPerformer,
    };
  }, [dashboard, tasks, members, contributions]);

  const teamActivity = useMemo(() => {
    return getWeeklyActivity(tasks);
  }, [tasks]);

  const teamInsights = useMemo(() => {
    return getTeamInsights({
      completionRate: teamMetrics.completionRate,
      overdue: teamMetrics.overdue,
      membersCount: teamMetrics.membersCount,
      topPerformer: teamMetrics.topPerformer?.fullName,
    });
  }, [teamMetrics]);

  const teamDistributionMax = Math.max(
    teamMetrics.completedTasks,
    teamMetrics.inProgress,
    teamMetrics.blocked,
    1,
  );

  const personalDistributionMax = Math.max(
    personalMetrics.completed,
    personalMetrics.inProgress,
    personalMetrics.blocked,
    1,
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader
        projectId={projectId}
        projectRole={currentProjectRole}
        systemRole={currentSystemRole}
      />

      <main className="mx-auto max-w-[1600px] px-8 py-10">
        <div className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3 text-sm text-white/45">
              <span>Аналитика</span>
              <span>›</span>
              <span className="text-white/80">
                {isManagerView ? 'Командный обзор' : 'Личный отчёт'}
              </span>
            </div>

            <h1 className="text-6xl font-semibold leading-[0.95] text-white">
              {isManagerView ? 'Аналитика команды' : 'Моя аналитика'}
            </h1>

            <p className="mt-4 max-w-[860px] text-xl leading-relaxed text-white/55">
              {isManagerView
                ? 'Командные KPI, вклад участников, динамика выполнения задач и управленческие рекомендации по проекту.'
                : 'Персональная статистика выполнения задач, динамика активности, рейтинг эффективности и рекомендации по повышению результата.'}
            </p>
          </div>

          <div className="flex items-center gap-4 rounded-[24px] border border-white/10 bg-[#141414] px-5 py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0b57f0] text-2xl font-semibold text-white">
              {isManagerView ? 'TM' : 'ME'}
            </div>

            <div>
              <div className="text-2xl font-semibold text-white">
                {isManagerView
                  ? 'Режим менеджера'
                  : currentProjectMember?.user?.fullName || 'Сотрудник проекта'}
              </div>
              <div className="mt-1 text-base text-white/55">
                {isManagerView
                  ? 'Командная аналитика проекта'
                  : 'Персональная аналитика сотрудника'}
              </div>
            </div>
          </div>
        </div>

        {notice && <InlineNotice type={notice.type} message={notice.message} />}

        {loading ? (
          <div className="rounded-[28px] border border-white/10 bg-[#141414] p-10 text-lg text-white/70">
            Загрузка аналитики проекта...
          </div>
        ) : isManagerView ? (
          <>
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-4">
              <StatCard
                title="Прогресс проекта"
                value={`${teamMetrics.completionRate}%`}
                subtitle="Общий процент выполнения задач команды"
                accent="#1da1ff"
                progress={teamMetrics.completionRate}
                extra={
                  <div className="mt-2 text-sm font-medium text-[#19d3a2]">
                    Выполнено {teamMetrics.completedTasks} из {teamMetrics.totalTasks}
                  </div>
                }
              />

              <StatCard
                title="Участники"
                value={`${teamMetrics.membersCount}`}
                subtitle="Количество сотрудников в проектной команде"
                accent="#a78bfa"
                progress={Math.min(teamMetrics.membersCount * 10, 100)}
              />

              <StatCard
                title="Просрочено"
                value={`${teamMetrics.overdue}`}
                subtitle="Задачи с нарушением сроков исполнения"
                accent="#ff6b6b"
                progress={Math.min((teamMetrics.overdue / Math.max(teamMetrics.totalTasks, 1)) * 100 * 4, 100)}
              />

              <StatCard
                title="Средний вклад"
                value={`${teamMetrics.avgContribution}%`}
                subtitle="Средний показатель вклада по участникам"
                accent="#19d3a2"
                progress={teamMetrics.avgContribution}
                extra={
                  teamMetrics.topPerformer ? (
                    <div className="mt-2 text-sm font-medium text-[#19d3a2]">
                      Лидер: {teamMetrics.topPerformer.fullName}
                    </div>
                  ) : null
                }
              />
            </section>

            <section className="mt-8 grid grid-cols-1 gap-6 2xl:grid-cols-[1.7fr_0.8fr]">
              <div className="rounded-[32px] border border-white/10 bg-[#141414] p-7 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-4xl font-semibold text-white">
                      Динамика команды
                    </h2>
                    <p className="mt-2 text-lg text-white/55">
                      Активность по задачам за последние 8 недель
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#1da1ff]" />
                      Выполнено
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#cfc9ff]" />
                      В работе
                    </div>
                  </div>
                </div>

                <ActivityChart data={teamActivity} />
              </div>

              <div className="rounded-[32px] bg-[#0b57f0] p-7 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                <h2 className="text-4xl font-semibold text-white">
                  Эффективность проекта
                </h2>

                <div className="mt-8">
                  <RatingCircle value={teamMetrics.completionRate} />
                </div>

                <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/15 pt-6">
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-[0.16em] text-white/65">
                      Выполнено
                    </div>
                    <div className="mt-2 text-4xl font-semibold text-white">
                      {teamMetrics.completedTasks}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs uppercase tracking-[0.16em] text-white/65">
                      В работе
                    </div>
                    <div className="mt-2 text-4xl font-semibold text-white">
                      {teamMetrics.inProgress}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs uppercase tracking-[0.16em] text-white/65">
                      Просрочено
                    </div>
                    <div className="mt-2 text-4xl font-semibold text-white">
                      {teamMetrics.overdue}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-8 grid grid-cols-1 gap-6 2xl:grid-cols-[0.95fr_1.35fr]">
              <div className="rounded-[32px] border border-white/10 bg-[#141414] p-7 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                <h2 className="text-4xl font-semibold text-white">
                  Структура задач
                </h2>

                <div className="mt-8 space-y-7">
                  <DistributionRow
                    label="Выполнено"
                    value={teamMetrics.completedTasks}
                    color="#1da1ff"
                    max={teamDistributionMax}
                  />
                  <DistributionRow
                    label="В работе"
                    value={teamMetrics.inProgress}
                    color="#8b5cf6"
                    max={teamDistributionMax}
                  />
                  <DistributionRow
                    label="Заблокировано"
                    value={teamMetrics.blocked}
                    color="#ff6b6b"
                    max={teamDistributionMax}
                  />
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-[#141414] p-7 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                <h2 className="text-4xl font-semibold text-white">
                  Управленческие выводы
                </h2>
                <InsightList items={teamInsights} />
              </div>
            </section>

            <section className="mt-8 rounded-[32px] border border-white/10 bg-[#141414] p-7 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              <div className="mb-6">
                <h2 className="text-4xl font-semibold text-white">
                  Вклад участников
                </h2>
                <p className="mt-2 text-lg text-white/55">
                  Сравнение вклада сотрудников по выполненным задачам
                </p>
              </div>

              {contributions.length > 0 ? (
                <TeamLeaderboard
                  items={[...contributions].sort(
                    (a, b) => b.contributionRate - a.contributionRate,
                  )}
                />
              ) : (
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-6 text-lg text-white/60">
                  Пока недостаточно данных для отображения вклада участников.
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-4">
              <StatCard
                title="Выполнение задач"
                value={`${personalMetrics.completionRate}%`}
                subtitle="Доля завершённых задач в рамках проекта"
                accent="#1da1ff"
                progress={personalMetrics.completionRate}
                extra={
                  <div className="mt-2 text-sm font-medium text-[#19d3a2]">
                    Выполнено {personalMetrics.completed} из {personalMetrics.total}
                  </div>
                }
              />

              <StatCard
                title="В работе"
                value={`${personalMetrics.inProgress}`}
                subtitle="Количество активных задач на текущий момент"
                accent="#a78bfa"
                progress={Math.min((personalMetrics.inProgress / Math.max(personalMetrics.total, 1)) * 100 * 2, 100)}
              />

              <StatCard
                title="Просрочено"
                value={`${personalMetrics.overdue}`}
                subtitle="Личные задачи с нарушенным сроком"
                accent="#ff6b6b"
                progress={Math.min((personalMetrics.overdue / Math.max(personalMetrics.total, 1)) * 100 * 4, 100)}
              />

              <StatCard
                title="Ср. скорость"
                value={formatDays(personalMetrics.avgDurationDays)}
                subtitle="Среднее время выполнения задачи"
                accent="#19d3a2"
                progress={personalMetrics.speedScore}
                extra={
                  <div className="mt-2 text-sm font-medium text-[#19d3a2]">
                    Скорость: {personalMetrics.speedScore} / 100
                  </div>
                }
              />
            </section>

            <section className="mt-8 grid grid-cols-1 gap-6 2xl:grid-cols-[1.7fr_0.8fr]">
              <div className="rounded-[32px] border border-white/10 bg-[#141414] p-7 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-4xl font-semibold text-white">
                      Личная динамика
                    </h2>
                    <p className="mt-2 text-lg text-white/55">
                      Активность по вашим задачам за последние 8 недель
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#1da1ff]" />
                      Выполнено
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#cfc9ff]" />
                      В работе
                    </div>
                  </div>
                </div>

                <ActivityChart data={personalActivity} />
              </div>

              <div className="rounded-[32px] bg-[#0b57f0] p-7 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                <h2 className="text-4xl font-semibold text-white">
                  Ваш рейтинг
                </h2>

                <div className="mt-8">
                  <RatingCircle value={personalMetrics.rating} />
                </div>

                <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/15 pt-6">
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-[0.16em] text-white/65">
                      Вклад
                    </div>
                    <div className="mt-2 text-4xl font-semibold text-white">
                      {personalMetrics.contributionScore}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs uppercase tracking-[0.16em] text-white/65">
                      Скорость
                    </div>
                    <div className="mt-2 text-4xl font-semibold text-white">
                      {personalMetrics.speedScore}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs uppercase tracking-[0.16em] text-white/65">
                      Надёжность
                    </div>
                    <div className="mt-2 text-4xl font-semibold text-white">
                      {personalMetrics.reliabilityScore}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-8 grid grid-cols-1 gap-6 2xl:grid-cols-[0.95fr_1.35fr]">
              <div className="rounded-[32px] border border-white/10 bg-[#141414] p-7 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                <h2 className="text-4xl font-semibold text-white">
                  Распределение задач
                </h2>

                <div className="mt-8 space-y-7">
                  <DistributionRow
                    label="Выполнено"
                    value={personalMetrics.completed}
                    color="#1da1ff"
                    max={personalDistributionMax}
                  />
                  <DistributionRow
                    label="В работе"
                    value={personalMetrics.inProgress}
                    color="#8b5cf6"
                    max={personalDistributionMax}
                  />
                  <DistributionRow
                    label="Заблокировано"
                    value={personalMetrics.blocked}
                    color="#ff6b6b"
                    max={personalDistributionMax}
                  />
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-[#141414] p-7 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                <h2 className="text-4xl font-semibold text-white">
                  Зоны роста
                </h2>
                <InsightList items={personalInsights} />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
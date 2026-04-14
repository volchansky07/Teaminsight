'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import api from '@/services/api';
import AppHeader from '@/components/AppHeader';
import InlineNotice from '@/components/InlineNotice';

type ProjectRole = 'OWNER' | 'MANAGER' | 'MEMBER';
type AnalyticsPeriod = '7d' | '14d' | '30d';
type TrendDirection = 'up' | 'down' | 'same';

interface NoticeState {
  type: 'success' | 'error';
  message: string;
}

interface TrendPoint {
  label: string;
  value: number;
}

interface DistributionPoint {
  label: string;
  value: number;
}

interface WorkloadMember {
  employeeId: string;
  fullName: string;
  activeTasks: number;
  completedTasks: number;
  complexityPoints: number;
}

interface RiskMember {
  employeeId: string;
  fullName: string;
  riskLevel: 'low' | 'medium' | 'high';
  personalKpi: number;
  overdueRate: number;
  onTimeRate: number;
}

interface LeaderboardItem {
  employeeId: string;
  fullName: string;
  personalKpi: number;
}

interface MonthlyItem {
  month: string;
  completedTasks: number;
  submittedReports: number;
  approvedReports: number;
  overdueTasks: number;
}

interface MetricTrend {
  delta: number;
  direction: TrendDirection;
}

interface SampleInfo {
  tasksCount: number;
  reportsCount: number;
  isSmall: boolean;
}

interface TeamAnalyticsResponse {
  period: AnalyticsPeriod;
  summary: {
    teamKpi: number;
    onTimeRate: number;
    completionRate: number;
    overdueRate: number;
    reportQuality: number;
    completedTasksCount: number;
    trends: {
      teamKpi: MetricTrend;
      onTimeRate: MetricTrend;
      overdueRate: MetricTrend;
      reportQuality: MetricTrend;
    };
    sample: SampleInfo;
  };
  charts: {
    teamCompletedTrend: TrendPoint[];
    statusDistribution: DistributionPoint[];
    workloadByMembers: WorkloadMember[];
  };
  membersRisk: RiskMember[];
  leaderboard: LeaderboardItem[];
  insights: string[];
}

interface PersonalAnalyticsResponse {
  period: AnalyticsPeriod;
  summary: {
    personalKpi: number;
    onTimeRate: number;
    completionRate: number;
    overdueRate: number;
    reportQuality: number;
    activeTasksCount: number;
    activeComplexityTotal: number;
    activeComplexityAverage: number;
    trends: {
      personalKpi: MetricTrend;
      onTimeRate: MetricTrend;
      overdueRate: MetricTrend;
      reportQuality: MetricTrend;
    };
    sample: SampleInfo;
  };
  charts: {
    completedTasksTrend: TrendPoint[];
    statusDistribution: DistributionPoint[];
  };
  insights: string[];
}

interface ProjectMember {
  userId: string;
  roleInProject: ProjectRole;
  user?: {
    id: string;
    fullName?: string;
    email?: string;
  };
}

const PERIOD_OPTIONS: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: '7d', label: '7 дней' },
  { value: '14d', label: '14 дней' },
  { value: '30d', label: '30 дней' },
];

const PIE_COLORS = ['#38bdf8', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

function parseJwt(
  token: string,
): { sub?: string; id?: string; role?: string } | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch {
    return null;
  }
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function riskLabel(level: 'low' | 'medium' | 'high') {
  switch (level) {
    case 'low':
      return 'Низкий';
    case 'medium':
      return 'Средний';
    case 'high':
      return 'Высокий';
    default:
      return '—';
  }
}

function riskClass(level: 'low' | 'medium' | 'high') {
  switch (level) {
    case 'low':
      return 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300';
    case 'medium':
      return 'border-amber-900/50 bg-amber-950/30 text-amber-300';
    case 'high':
      return 'border-red-900/50 bg-red-950/30 text-red-300';
    default:
      return 'border-neutral-700 bg-neutral-900 text-neutral-300';
  }
}

function shortenName(name: string, max = 18) {
  if (!name) return '—';
  return name.length > max ? `${name.slice(0, max - 3)}...` : name;
}

function getTrendText(delta: number, direction: TrendDirection) {
  if (direction === 'up') return `↑ +${Math.abs(delta)}`;
  if (direction === 'down') return `↓ -${Math.abs(delta)}`;
  return '→ 0';
}

function getTrendClass(
  direction: TrendDirection,
  reverseMeaning = false,
): string {
  if (direction === 'same') return 'text-white/45';

  if (reverseMeaning) {
    return direction === 'up' ? 'text-red-300' : 'text-emerald-300';
  }

  return direction === 'up' ? 'text-emerald-300' : 'text-red-300';
}

function AnalyticsCard({
  title,
  value,
  description,
  accentClass = 'text-white',
  delta,
  direction,
  reverseTrendMeaning = false,
  showSampleWarning = false,
}: {
  title: string;
  value: string;
  description: string;
  accentClass?: string;
  delta?: number;
  direction?: TrendDirection;
  reverseTrendMeaning?: boolean;
  showSampleWarning?: boolean;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#141414] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:border-white/15 hover:translate-y-[-2px]">
      <p className="text-[12px] uppercase tracking-[0.22em] text-white/45">
        {title}
      </p>

      <div className={`mt-4 text-5xl font-semibold leading-none ${accentClass}`}>
        {value}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {typeof delta === 'number' && direction ? (
          <span
            className={`text-sm font-medium ${getTrendClass(
              direction,
              reverseTrendMeaning,
            )}`}
          >
            {getTrendText(delta, direction)}
          </span>
        ) : null}

        {showSampleWarning ? (
          <span className="rounded-full border border-amber-900/40 bg-amber-950/20 px-2.5 py-1 text-[11px] text-amber-300">
            Небольшая выборка
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-white/55">{description}</p>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-[#141414] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
      <div className="mb-5">
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        {subtitle ? (
          <p className="mt-2 text-sm text-white/55">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function PeriodSwitcher({
  value,
  onChange,
}: {
  value: AnalyticsPeriod;
  onChange: (value: AnalyticsPeriod) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={[
            'rounded-full px-5 py-3 text-sm font-medium transition',
            value === option.value
              ? 'bg-white text-black'
              : 'border border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white',
          ].join(' ')}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 p-8 text-center text-white/45">
      {text}
    </div>
  );
}

function TeamAnalyticsView({
  data,
  monthly,
}: {
  data: TeamAnalyticsResponse;
  monthly: MonthlyItem[];
}) {
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <AnalyticsCard
          title="Командный KPI"
          value={formatPercent(data.summary.teamKpi)}
          description="Интегральная оценка эффективности команды с учётом сроков, завершения задач, качества отчётов и дисциплины."
          accentClass="text-white"
          delta={data.summary.trends.teamKpi.delta}
          direction={data.summary.trends.teamKpi.direction}
          showSampleWarning={data.summary.sample.isSmall}
        />
        <AnalyticsCard
          title="Выполнение в срок"
          value={formatPercent(data.summary.onTimeRate)}
          description="Доля задач команды, завершённых в рамках установленного дедлайна."
          accentClass="text-emerald-300"
          delta={data.summary.trends.onTimeRate.delta}
          direction={data.summary.trends.onTimeRate.direction}
          showSampleWarning={data.summary.sample.isSmall}
        />
        <AnalyticsCard
          title="Просрочки"
          value={formatPercent(data.summary.overdueRate)}
          description="Доля задач периода, по которым наблюдается просрочка или факт завершения позже дедлайна."
          accentClass="text-amber-300"
          delta={data.summary.trends.overdueRate.delta}
          direction={data.summary.trends.overdueRate.direction}
          reverseTrendMeaning
          showSampleWarning={data.summary.sample.isSmall}
        />
        <AnalyticsCard
          title="Качество отчётов"
          value={formatPercent(data.summary.reportQuality)}
          description="Процент отчётов, которые были приняты с первого раза без возврата на доработку."
          accentClass="text-sky-300"
          delta={data.summary.trends.reportQuality.delta}
          direction={data.summary.trends.reportQuality.direction}
          showSampleWarning={data.summary.sample.isSmall}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <SectionCard
          title="Темп выполнения команды"
          subtitle={`Динамика завершения задач по дням за ${data.period === '7d' ? 'последние 7 дней' : data.period === '14d' ? 'последние 14 дней' : 'последние 30 дней'}.`}
        >
          {data.charts.teamCompletedTrend.length === 0 ? (
            <EmptyState text="Недостаточно данных для построения графика." />
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.charts.teamCompletedTrend}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.35)" />
                  <YAxis stroke="rgba(255,255,255,0.35)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#111',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 16,
                      color: '#fff',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Структура задач"
          subtitle="Распределение задач команды по основным статусам в текущем периоде."
        >
          {data.charts.statusDistribution.every((item) => item.value === 0) ? (
            <EmptyState text="Нет данных по статусам задач." />
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.statusDistribution}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={55}
                    paddingAngle={4}
                  >
                    {data.charts.statusDistribution.map((entry, index) => (
                      <Cell
                        key={entry.label}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      background: '#111',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 16,
                      color: '#fff',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
        <SectionCard
          title="Нагрузка по участникам"
          subtitle="Сравнение активной нагрузки, завершения задач и сложности по каждому сотруднику."
        >
          {data.charts.workloadByMembers.length === 0 ? (
            <EmptyState text="В проекте пока нет данных по загрузке участников." />
          ) : (
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.charts.workloadByMembers}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
                  <XAxis type="number" stroke="rgba(255,255,255,0.35)" />
                  <YAxis
                    type="category"
                    dataKey="fullName"
                    width={170}
                    tickFormatter={(value) => shortenName(value)}
                    stroke="rgba(255,255,255,0.35)"
                  />
                  <Tooltip
                    cursor={false}
                    formatter={(value, name) => [value, name]}
                    labelFormatter={(label) => `Сотрудник: ${label}`}
                    contentStyle={{
                      background: '#111',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 16,
                      color: '#fff',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="activeTasks"
                    name="Активные задачи"
                    fill="#38bdf8"
                    radius={[0, 8, 8, 0]}
                  />
                  <Bar
                    dataKey="completedTasks"
                    name="Завершённые"
                    fill="#10b981"
                    radius={[0, 8, 8, 0]}
                  />
                  <Bar
                    dataKey="complexityPoints"
                    name="Баллы сложности"
                    fill="#a855f7"
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Лидерборд команды"
          subtitle="Участники проекта, отсортированные по личному KPI."
        >
          {data.leaderboard.length === 0 ? (
            <EmptyState text="Недостаточно данных для построения рейтинга." />
          ) : (
            <div className="space-y-3">
              {data.leaderboard.map((member, index) => (
                <div
                  key={member.employeeId}
                  className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-4"
                >
                  <div>
                    <div className="text-sm text-white/45">#{index + 1}</div>
                    <div className="mt-1 text-base font-medium text-white">
                      {member.fullName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white/45">KPI</div>
                    <div className="mt-1 text-xl font-semibold text-emerald-300">
                      {formatPercent(member.personalKpi)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
        <SectionCard
          title="Риск-профиль сотрудников"
          subtitle="Оценка индивидуального риска по срокам, нагрузке и дисциплине исполнения."
        >
          {data.membersRisk.length === 0 ? (
            <EmptyState text="Риск-профиль пока недоступен." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.14em] text-white/40">
                    <th className="px-4 py-2">Сотрудник</th>
                    <th className="px-4 py-2">Риск</th>
                    <th className="px-4 py-2">KPI</th>
                    <th className="px-4 py-2">В срок</th>
                    <th className="px-4 py-2">Просрочки</th>
                  </tr>
                </thead>
                <tbody>
                  {data.membersRisk.map((member) => (
                    <tr key={member.employeeId} className="rounded-2xl bg-black/20">
                      <td className="rounded-l-2xl px-4 py-4 text-white">
                        {member.fullName}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${riskClass(member.riskLevel)}`}
                        >
                          {riskLabel(member.riskLevel)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-white">
                        {formatPercent(member.personalKpi)}
                      </td>
                      <td className="px-4 py-4 text-white">
                        {formatPercent(member.onTimeRate)}
                      </td>
                      <td className="rounded-r-2xl px-4 py-4 text-white">
                        {formatPercent(member.overdueRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Помесячная сводка"
          subtitle="Динамика проекта по месяцам: завершение задач, отчёты и просрочки."
        >
          {monthly.length === 0 ? (
            <EmptyState text="Помесячная сводка пока недоступна." />
          ) : (
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.35)" />
                  <YAxis stroke="rgba(255,255,255,0.35)" allowDecimals={false} />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      background: '#111',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 16,
                      color: '#fff',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="completedTasks"
                    name="Завершённые задачи"
                    fill="#10b981"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    dataKey="approvedReports"
                    name="Принятые отчёты"
                    fill="#38bdf8"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    dataKey="overdueTasks"
                    name="Просрочки"
                    fill="#ef4444"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </section>

      <SectionCard
        title="Аналитическая сводка"
        subtitle="Краткие автоматически сформированные выводы по текущим показателям команды."
      >
        {data.insights.length === 0 ? (
          <EmptyState text="Пока недостаточно данных для формирования аналитических выводов." />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {data.insights.map((insight, index) => (
              <div
                key={`${insight}-${index}`}
                className="rounded-2xl border border-white/8 bg-black/20 px-5 py-4 text-white/80"
              >
                {insight}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function PersonalAnalyticsView({
  data,
  monthly,
}: {
  data: PersonalAnalyticsResponse;
  monthly: MonthlyItem[];
}) {
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <AnalyticsCard
          title="Личный KPI"
          value={formatPercent(data.summary.personalKpi)}
          description="Интегральная оценка вашей эффективности с учётом сроков, выполнения задач, качества отчётов и дисциплины."
          accentClass="text-white"
          delta={data.summary.trends.personalKpi.delta}
          direction={data.summary.trends.personalKpi.direction}
          showSampleWarning={data.summary.sample.isSmall}
        />
        <AnalyticsCard
          title="Выполнение в срок"
          value={formatPercent(data.summary.onTimeRate)}
          description="Доля ваших задач, завершённых в рамках установленного дедлайна."
          accentClass="text-emerald-300"
          delta={data.summary.trends.onTimeRate.delta}
          direction={data.summary.trends.onTimeRate.direction}
          showSampleWarning={data.summary.sample.isSmall}
        />
        <AnalyticsCard
          title="Просрочки"
          value={formatPercent(data.summary.overdueRate)}
          description="Процент задач, по которым зафиксировано превышение срока выполнения."
          accentClass="text-amber-300"
          delta={data.summary.trends.overdueRate.delta}
          direction={data.summary.trends.overdueRate.direction}
          reverseTrendMeaning
          showSampleWarning={data.summary.sample.isSmall}
        />
        <AnalyticsCard
          title="Качество отчётов"
          value={formatPercent(data.summary.reportQuality)}
          description="Процент отчётов, принятых с первого раза без возврата на доработку."
          accentClass="text-sky-300"
          delta={data.summary.trends.reportQuality.delta}
          direction={data.summary.trends.reportQuality.direction}
          showSampleWarning={data.summary.sample.isSmall}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <SectionCard
          title="Динамика завершения задач"
          subtitle={`Количество ваших завершённых задач по дням за ${data.period === '7d' ? 'последние 7 дней' : data.period === '14d' ? 'последние 14 дней' : 'последние 30 дней'}.`}
        >
          {data.charts.completedTasksTrend.length === 0 ? (
            <EmptyState text="Недостаточно данных для построения графика." />
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.charts.completedTasksTrend}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.35)" />
                  <YAxis stroke="rgba(255,255,255,0.35)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#111',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 16,
                      color: '#fff',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Структура задач"
          subtitle="Распределение ваших задач по статусам в текущем периоде."
        >
          {data.charts.statusDistribution.every((item) => item.value === 0) ? (
            <EmptyState text="Нет данных по структуре задач." />
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.statusDistribution}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={55}
                    paddingAngle={4}
                  >
                    {data.charts.statusDistribution.map((entry, index) => (
                      <Cell
                        key={entry.label}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#111',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 16,
                      color: '#fff',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.4fr]">
        <SectionCard
          title="Текущая нагрузка"
          subtitle="Оценка вашей активной загрузки в данный момент."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
              <div className="text-sm text-white/45">Задач в работе</div>
              <div className="mt-3 text-3xl font-semibold text-white">
                {data.summary.activeTasksCount}
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
              <div className="text-sm text-white/45">Суммарная сложность</div>
              <div className="mt-3 text-3xl font-semibold text-emerald-300">
                {data.summary.activeComplexityTotal}
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
              <div className="text-sm text-white/45">Средняя сложность</div>
              <div className="mt-3 text-3xl font-semibold text-sky-300">
                {data.summary.activeComplexityAverage}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Помесячная сводка"
          subtitle="Ваши рабочие показатели в проекте по месяцам."
        >
          {monthly.length === 0 ? (
            <EmptyState text="Помесячная сводка пока недоступна." />
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.35)" />
                  <YAxis stroke="rgba(255,255,255,0.35)" allowDecimals={false} />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      background: '#111',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 16,
                      color: '#fff',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="completedTasks"
                    name="Завершённые задачи"
                    fill="#10b981"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    dataKey="approvedReports"
                    name="Принятые отчёты"
                    fill="#38bdf8"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    dataKey="overdueTasks"
                    name="Просрочки"
                    fill="#ef4444"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </section>

      <SectionCard
        title="Аналитическая сводка"
        subtitle="Краткие автоматически сформированные выводы по вашим рабочим показателям."
      >
        {data.insights.length === 0 ? (
          <EmptyState text="Пока недостаточно данных для формирования аналитических выводов." />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {data.insights.map((insight, index) => (
              <div
                key={`${insight}-${index}`}
                className="rounded-2xl border border-white/8 bg-black/20 px-5 py-4 text-white/80"
              >
                {insight}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export default function ProjectAnalyticsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [period, setPeriod] = useState<AnalyticsPeriod>('14d');
  const [projectRole, setProjectRole] = useState<ProjectRole | null>(null);

  const [teamData, setTeamData] = useState<TeamAnalyticsResponse | null>(null);
  const [personalData, setPersonalData] =
    useState<PersonalAnalyticsResponse | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const isManagerView = useMemo(() => {
    return projectRole === 'OWNER' || projectRole === 'MANAGER';
  }, [projectRole]);

  const loadProjectRole = async () => {
    const token = localStorage.getItem('token') || '';
    const payload = parseJwt(token);
    const currentUserId = payload?.sub || payload?.id;

    if (!currentUserId) {
      throw new Error('Не удалось определить пользователя.');
    }

    const membersRes = await api.get(`/projects/${projectId}/members`);
    const members: ProjectMember[] = membersRes.data ?? [];

    const currentMember = members.find(
      (member) =>
        member.userId === currentUserId || member.user?.id === currentUserId,
    );

    if (!currentMember) {
      throw new Error('Не удалось определить роль пользователя в проекте.');
    }

    setProjectRole(currentMember.roleInProject);
    return currentMember.roleInProject;
  };

  const loadAnalytics = async (
    resolvedRole?: ProjectRole | null,
    options?: { initial?: boolean },
  ) => {
    const role = resolvedRole ?? projectRole;
    if (!role) return;

    if (options?.initial) {
      setLoading(true);
    } else {
      setAnalyticsLoading(true);
    }

    setNotice(null);

    try {
      const [monthlyRes, analyticsRes] = await Promise.all([
        role === 'OWNER' || role === 'MANAGER'
          ? api.get(`/analytics/projects/${projectId}/monthly/team`)
          : api.get(`/analytics/projects/${projectId}/monthly/personal`),
        role === 'OWNER' || role === 'MANAGER'
          ? api.get(`/analytics/projects/${projectId}/team?period=${period}`)
          : api.get(`/analytics/projects/${projectId}/personal?period=${period}`),
      ]);

      setMonthlyData(monthlyRes.data ?? []);

      if (role === 'OWNER' || role === 'MANAGER') {
        setTeamData(analyticsRes.data);
        setPersonalData(null);
      } else {
        setPersonalData(analyticsRes.data);
        setTeamData(null);
      }
    } catch (error) {
      console.error('Ошибка загрузки аналитики:', error);
      setNotice({
        type: 'error',
        message: 'Не удалось загрузить аналитические данные проекта.',
      });
    } finally {
      setLoading(false);
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const role = await loadProjectRole();
        await loadAnalytics(role, { initial: true });
      } catch (error) {
        console.error('Ошибка инициализации аналитики:', error);
        setNotice({
          type: 'error',
          message:
            'Не удалось определить роль пользователя или загрузить аналитику.',
        });
        setLoading(false);
      }
    };

    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!projectRole) return;
    loadAnalytics(undefined, { initial: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />

      <main className="mx-auto max-w-[1600px] px-8 py-10">
        <div className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[13px] uppercase tracking-[0.22em] text-white/40">
              Аналитика проекта
            </p>
            <h1 className="mt-3 text-6xl font-semibold leading-[0.95] text-white">
              {isManagerView ? 'Командная аналитика' : 'Личная аналитика'}
            </h1>
            <p className="mt-4 max-w-[980px] text-lg leading-relaxed text-white/55">
              {isManagerView
                ? 'Отслеживайте эффективность команды, дисциплину по срокам, качество отчётов и распределение рабочей нагрузки.'
                : 'Оценивайте личную результативность, качество отчётов, дисциплину по срокам и текущую рабочую нагрузку.'}
            </p>
          </div>

          <PeriodSwitcher value={period} onChange={setPeriod} />
        </div>

        {notice ? <InlineNotice type={notice.type} message={notice.message} /> : null}

        {loading ? (
          <div className="rounded-[30px] border border-white/10 bg-[#141414] p-10 text-lg text-white/70">
            Загрузка аналитики...
          </div>
        ) : (
          <div className="relative">
            {analyticsLoading ? (
              <div className="pointer-events-none absolute inset-0 z-10 rounded-[30px] bg-black/20 backdrop-blur-[1px]" />
            ) : null}

            {isManagerView && teamData ? (
              <TeamAnalyticsView data={teamData} monthly={monthlyData} />
            ) : personalData ? (
              <PersonalAnalyticsView data={personalData} monthly={monthlyData} />
            ) : (
              <div className="rounded-[30px] border border-white/10 bg-[#141414] p-10 text-lg text-white/70">
                Аналитические данные пока недоступны.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
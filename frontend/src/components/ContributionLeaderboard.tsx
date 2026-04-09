'use client';

import type { ContributionItem } from '@/types/contribution';

interface Props {
  items: ContributionItem[];
}

function getRoleLabel(role: string) {
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

function getScoreBarWidth(score: number, maxScore: number) {
  if (maxScore <= 0) return '0%';
  return `${Math.max(8, Math.round((score / maxScore) * 100))}%`;
}

export default function ContributionLeaderboard({ items }: Props) {
  const maxScore =
    items.length > 0 ? Math.max(...items.map((i) => i.contributionScore)) : 0;

  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 space-y-6">
      <div>
        <p className="text-neutral-500 text-sm uppercase tracking-[0.2em] mb-3">
          АНАЛИТИКА КОМАНДЫ
        </p>
        <h2 className="text-3xl font-bold tracking-tight">Вклад команды</h2>
        <p className="text-neutral-400 mt-3">
          Итоговый балл формируется на основе выполненных задач, сложности, приоритета и своевременности выполнения.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-neutral-700 rounded-2xl p-8 text-center text-neutral-500 bg-neutral-950/40">
          <p className="text-sm">Данных по вкладу пока нет</p>
          <p className="text-xs mt-2 text-neutral-600">
            Назначьте задачи участникам проекта, чтобы начать отслеживать их вклад.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={item.employeeId}
              className="bg-neutral-800 border border-neutral-700 rounded-2xl p-5 hover:border-neutral-500 transition"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="h-11 w-11 rounded-2xl bg-neutral-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    #{index + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold break-words">
                        {item.fullName}
                      </h3>
                      <span className="px-2.5 py-1 rounded-full text-xs bg-neutral-700 text-neutral-300 border border-neutral-600">
                        {getRoleLabel(item.roleInProject)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-neutral-400">
                      <span>Выполнено: {item.completedTasks}</span>
                      <span>В работе: {item.inProgressTasks}</span>
                      <span>К выполнению: {item.todoTasks}</span>
                      <span>В срок: {item.onTimeRate}%</span>
                      <span>Просрочено: {item.overdueTasks}</span>
                    </div>
                  </div>
                </div>

                <div className="lg:text-right shrink-0">
                  <div className="text-neutral-400 text-sm">Итоговый балл</div>
                  <div className="text-3xl font-bold text-white mt-1">
                    {item.contributionScore}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
                  <span>Сила вклада</span>
                  <span>{item.contributionScore} балл.</span>
                </div>

                <div className="h-2 rounded-full bg-neutral-700 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-white transition-all"
                    style={{
                      width: getScoreBarWidth(item.contributionScore, maxScore),
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                <MiniMetric label="Назначено" value={item.totalAssignedTasks} />
                <MiniMetric
                  label="Сложность"
                  value={item.completedComplexityPoints}
                />
                <MiniMetric
                  label="Приоритет"
                  value={item.completedPriorityScore}
                />
                <MiniMetric
                  label="Выполнено в срок"
                  value={item.onTimeCompletedTasks}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-4">
      <div className="text-xs text-neutral-500 mb-2">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
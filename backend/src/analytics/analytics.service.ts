import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type AnalyticsPeriod = '7d' | '14d' | '30d';
type TrendDirection = 'up' | 'down' | 'same';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private getPeriodDays(period: AnalyticsPeriod) {
    switch (period) {
      case '7d':
        return 7;
      case '14d':
        return 14;
      case '30d':
      default:
        return 30;
    }
  }

  private getPeriodStartDate(period: AnalyticsPeriod) {
    const days = this.getPeriodDays(period);
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (days - 1));
    return startDate;
  }

  private getPreviousPeriodStartDate(period: AnalyticsPeriod) {
    const currentStart = this.getPeriodStartDate(period);
    const days = this.getPeriodDays(period);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - days);
    return previousStart;
  }

  private getPreviousPeriodEndDate(period: AnalyticsPeriod) {
    const currentStart = this.getPeriodStartDate(period);
    const previousEnd = new Date(currentStart);
    previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);
    return previousEnd;
  }

  private buildDailyLabels(period: AnalyticsPeriod) {
    const days = this.getPeriodDays(period);
    const labels: string[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);

      labels.push(
        date.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
        }),
      );
    }

    return labels;
  }

  private formatDayLabel(date: Date) {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
    });
  }

  private calculateRate(part: number, total: number) {
    if (!total || total === 0) return 0;
    return Math.round((part / total) * 100);
  }

  private calculateDelta(current: number, previous: number) {
    return current - previous;
  }

  private getTrendDirection(delta: number): TrendDirection {
    if (delta > 0) return 'up';
    if (delta < 0) return 'down';
    return 'same';
  }

  private buildTrend(current: number, previous: number) {
    const delta = this.calculateDelta(current, previous);
    return {
      delta,
      direction: this.getTrendDirection(delta),
    };
  }

  private calculatePersonalKpi(params: {
    onTimeRate: number;
    completionRate: number;
    firstApprovalRate: number;
  }) {
    const base =
      params.completionRate * 0.4 +
      params.onTimeRate * 0.35 +
      params.firstApprovalRate * 0.25;

    const penalty = params.onTimeRate < 50 ? 0.8 : 1;

    return Math.round(base * penalty);
  }

  private calculateTeamKpi(params: {
    onTimeRate: number;
    reportQuality: number;
    completionRate: number;
  }) {
    const base =
      params.completionRate * 0.4 +
      params.onTimeRate * 0.35 +
      params.reportQuality * 0.25;

    const penalty = params.onTimeRate < 60 ? 0.85 : 1;

    return Math.round(base * penalty);
  }

  private detectRiskLevel(params: {
    overdueRate: number;
    onTimeRate: number;
    activeTasks: number;
  }): 'low' | 'medium' | 'high' {
    const hasHighOverdue = params.overdueRate >= 25;
    const hasLowOnTime = params.onTimeRate < 50;
    const hasCriticalLoad = params.activeTasks >= 6;

    if (hasHighOverdue || hasLowOnTime || hasCriticalLoad) {
      return 'high';
    }

    const hasMediumOverdue = params.overdueRate >= 10;
    const hasMediumOnTime = params.onTimeRate < 75;
    const hasHighLoad = params.activeTasks >= 4;

    if (hasMediumOverdue || hasMediumOnTime || hasHighLoad) {
      return 'medium';
    }

    return 'low';
  }

  private buildInsightsForPersonal(params: {
    personalKpi: number;
    onTimeRate: number;
    overdueRate: number;
    reportQuality: number;
    activeTasksCount: number;
    isSampleSmall: boolean;
  }) {
    const insights: string[] = [];

    if (params.isSampleSmall) {
      insights.push(
        'Аналитика построена на ограниченном объёме данных, поэтому выводы носят предварительный характер.',
      );
    }

    if (params.personalKpi >= 80) {
      insights.push('Вы демонстрируете высокий уровень личной эффективности.');
    } else if (params.personalKpi >= 60) {
      insights.push('Ваш показатель эффективности находится на стабильном уровне.');
    } else {
      insights.push(
        'Личный KPI ниже целевого уровня. Требуется улучшение дисциплины и темпа выполнения.',
      );
    }

    if (params.onTimeRate >= 80) {
      insights.push('Вы стабильно закрываете задачи в срок.');
    } else if (params.onTimeRate < 50) {
      insights.push('Есть выраженный риск по соблюдению сроков выполнения задач.');
    }

    if (params.reportQuality >= 80) {
      insights.push('Качество ваших отчётов находится на высоком уровне.');
    } else if (params.reportQuality < 50) {
      insights.push(
        'Часть отчётов требует доработки. Есть потенциал улучшения качества сдачи результата.',
      );
    }

    if (params.activeTasksCount >= 5) {
      insights.push(
        `Текущая нагрузка повышена: сейчас в работе ${params.activeTasksCount} задач.`,
      );
    }

    if (params.overdueRate > 20) {
      insights.push('Доля просрочек выше рекомендуемого уровня.');
    }

    return insights;
  }

  private buildInsightsForTeam(params: {
    teamKpi: number;
    onTimeRate: number;
    overdueRate: number;
    reportQuality: number;
    highRiskCount: number;
    isSampleSmall: boolean;
  }) {
    const insights: string[] = [];

    if (params.isSampleSmall) {
      insights.push(
        'Командная аналитика основана на ограниченной выборке, поэтому показатели требуют дополнительного накопления данных.',
      );
    }

    if (params.teamKpi >= 80) {
      insights.push('Команда демонстрирует высокий общий уровень эффективности.');
    } else if (params.teamKpi >= 60) {
      insights.push(
        'Команда работает стабильно, но есть точки роста по исполнительской дисциплине.',
      );
    } else {
      insights.push(
        'Командный KPI ниже целевого уровня. Требуются управленческие корректировки.',
      );
    }

    if (params.onTimeRate >= 75) {
      insights.push(
        'Темп выполнения задач и соблюдение сроков находятся на хорошем уровне.',
      );
    } else if (params.onTimeRate < 50) {
      insights.push(
        'Основная зона риска — низкая доля задач, завершённых в срок.',
      );
    }

    if (params.reportQuality >= 80) {
      insights.push('Качество отчётов команды остаётся на высоком уровне.');
    } else if (params.reportQuality < 50) {
      insights.push(
        'Часть отчётов требует доработки, что снижает общую скорость выполнения.',
      );
    }

    if (params.overdueRate > 20) {
      insights.push('В проекте наблюдается повышенная доля просроченных задач.');
    }

    if (params.highRiskCount > 0) {
      insights.push(
        `В команде выявлены сотрудники с высоким уровнем риска: ${params.highRiskCount}.`,
      );
    }

    return insights;
  }

  private buildPrimaryInsightForPersonal(params: {
    personalKpi: number;
    onTimeRate: number;
    overdueRate: number;
    reportQuality: number;
    activeTasksCount: number;
    trends: {
      personalKpi: { delta: number; direction: 'up' | 'down' | 'same' };
      onTimeRate: { delta: number; direction: 'up' | 'down' | 'same' };
      overdueRate: { delta: number; direction: 'up' | 'down' | 'same' };
      reportQuality: { delta: number; direction: 'up' | 'down' | 'same' };
    };
    isSampleSmall: boolean;
  }) {
    if (params.isSampleSmall) {
      return {
        tone: 'neutral' as const,
        title: 'Недостаточно данных',
        text: 'Для точной персональной оценки пока недостаточно накопленных данных. Аналитика будет становиться точнее по мере выполнения задач и отправки отчётов.',
      };
    }

    if (params.overdueRate >= 25 || params.trends.overdueRate.direction === 'up') {
      return {
        tone: 'danger' as const,
        title: 'Зона внимания — сроки',
        text: 'Основной риск текущего периода связан с просрочками. Стоит уделить внимание соблюдению дедлайнов и более раннему завершению задач.',
      };
    }

    if (params.activeTasksCount >= 5) {
      return {
        tone: 'warning' as const,
        title: 'Повышенная нагрузка',
        text: `Сейчас в работе ${params.activeTasksCount} задач. Есть риск перегрузки, поэтому важно контролировать приоритеты и сроки выполнения.`,
      };
    }

    if (params.reportQuality >= 80 && params.trends.reportQuality.direction !== 'down') {
      return {
        tone: 'positive' as const,
        title: 'Сильная сторона — качество отчётов',
        text: 'Ваши отчёты стабильно принимаются на хорошем уровне. Это говорит о качественной сдаче результата и хорошей подготовке материалов.',
      };
    }

    if (params.onTimeRate >= 80 && params.trends.onTimeRate.direction !== 'down') {
      return {
        tone: 'positive' as const,
        title: 'Сильная сторона — дисциплина по срокам',
        text: 'Вы уверенно соблюдаете сроки выполнения задач. Это положительно влияет на личный KPI и общую стабильность работы.',
      };
    }

    if (params.personalKpi >= 75 && params.trends.personalKpi.direction === 'up') {
      return {
        tone: 'positive' as const,
        title: 'Позитивная динамика периода',
        text: 'Ваш личный KPI растёт по сравнению с предыдущим периодом. Это показывает положительную динамику результативности.',
      };
    }

    return {
      tone: 'neutral' as const,
      title: 'Стабильный рабочий период',
      text: 'Показатели остаются в стабильной зоне. Для дальнейшего роста стоит уделить внимание скорости закрытия задач и качеству отчётности.',
    };
  }

  private buildPrimaryInsightForTeam(params: {
    teamKpi: number;
    onTimeRate: number;
    overdueRate: number;
    reportQuality: number;
    highRiskCount: number;
    trends: {
      teamKpi: { delta: number; direction: 'up' | 'down' | 'same' };
      onTimeRate: { delta: number; direction: 'up' | 'down' | 'same' };
      overdueRate: { delta: number; direction: 'up' | 'down' | 'same' };
      reportQuality: { delta: number; direction: 'up' | 'down' | 'same' };
    };
    isSampleSmall: boolean;
  }) {
    if (params.isSampleSmall) {
      return {
        tone: 'neutral' as const,
        title: 'Недостаточно данных',
        text: 'Для уверенной управленческой оценки пока недостаточно накопленных данных. По мере работы команды аналитическая картина станет точнее.',
      };
    }

    if (params.highRiskCount > 0) {
      return {
        tone: 'danger' as const,
        title: 'Основная зона риска — сотрудники высокого риска',
        text: `В проекте есть сотрудники с высоким уровнем риска: ${params.highRiskCount}. Требуется внимание к срокам, нагрузке и исполнительской дисциплине.`,
      };
    }

    if (params.overdueRate >= 20 || params.trends.overdueRate.direction === 'up') {
      return {
        tone: 'danger' as const,
        title: 'Основная зона риска — просрочки',
        text: 'В выбранном периоде наблюдается повышенная доля просроченных задач. Это ключевая точка внимания для руководителя проекта.',
      };
    }

    if (params.reportQuality < 50) {
      return {
        tone: 'warning' as const,
        title: 'Точка роста — качество отчётов',
        text: 'Качество отчётности команды ниже желаемого уровня. Возвраты на доработку замедляют общий темп выполнения задач.',
      };
    }

    if (
      params.teamKpi >= 80 &&
      params.onTimeRate >= 75 &&
      params.trends.teamKpi.direction !== 'down'
    ) {
      return {
        tone: 'positive' as const,
        title: 'Команда работает эффективно',
        text: 'Команда демонстрирует высокий уровень эффективности: задачи закрываются стабильно, а дисциплина по срокам находится на хорошем уровне.',
      };
    }

    if (params.trends.teamKpi.direction === 'up') {
      return {
        tone: 'positive' as const,
        title: 'Позитивная динамика команды',
        text: 'Командный KPI растёт относительно предыдущего периода. Это говорит о положительной динамике выполнения задач и устойчивости рабочих процессов.',
      };
    }

    return {
      tone: 'neutral' as const,
      title: 'Стабильное состояние команды',
      text: 'Команда работает в устойчивом режиме. Дальнейшее улучшение возможно за счёт снижения просрочек и повышения качества отчётов.',
    };
  }

  private async ensureProjectAccess(projectId: string, userId: string) {
    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied');
    }

    return membership;
  }

  private buildStatusDistribution(
    tasks: Array<{
      dueDate: Date | null;
      completedAt: Date | null;
      status?: { name: string } | null;
    }>,
  ) {
    const now = new Date();

    return [
      {
        label: 'К выполнению',
        value: tasks.filter((task) => task.status?.name === 'Todo').length,
      },
      {
        label: 'В работе',
        value: tasks.filter((task) => task.status?.name === 'In Progress').length,
      },
      {
        label: 'Выполнено',
        value: tasks.filter((task) => task.status?.name === 'Done').length,
      },
      {
        label: 'Просрочено',
        value: tasks.filter((task) => {
          if (!task.dueDate) return false;
          if (task.completedAt) {
            return (
              new Date(task.completedAt).getTime() >
              new Date(task.dueDate).getTime()
            );
          }
          return new Date(task.dueDate).getTime() < now.getTime();
        }).length,
      },
    ];
  }

  private buildTrendPoints(
    labels: string[],
    completedTasks: Array<{ completedAt: Date | null }>,
  ) {
    const trendMap = new Map<string, number>();
    labels.forEach((label) => trendMap.set(label, 0));

    completedTasks.forEach((task) => {
      if (!task.completedAt) return;
      const label = this.formatDayLabel(new Date(task.completedAt));
      if (trendMap.has(label)) {
        trendMap.set(label, (trendMap.get(label) ?? 0) + 1);
      }
    });

    return labels.map((label) => ({
      label,
      value: trendMap.get(label) ?? 0,
    }));
  }

  private buildMonthlySummary(
    tasks: Array<{
      id: string;
      dueDate: Date | null;
      completedAt: Date | null;
    }>,
    reports: Array<{
      id: string;
      status: string;
      createdAt: Date;
    }>,
  ) {
    const monthlyMap = new Map<
      string,
      {
        month: string;
        completedTasks: number;
        submittedReports: number;
        approvedReports: number;
        overdueTasks: number;
      }
    >();

    const ensureMonth = (date: Date) => {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric',
      });

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          month: label,
          completedTasks: 0,
          submittedReports: 0,
          approvedReports: 0,
          overdueTasks: 0,
        });
      }

      return monthlyMap.get(key)!;
    };

    tasks.forEach((task) => {
      if (task.completedAt) {
        ensureMonth(new Date(task.completedAt)).completedTasks += 1;
      }

      if (task.dueDate && task.completedAt) {
        if (
          new Date(task.completedAt).getTime() >
          new Date(task.dueDate).getTime()
        ) {
          ensureMonth(new Date(task.completedAt)).overdueTasks += 1;
        }
      }
    });

    reports.forEach((report) => {
      const monthBucket = ensureMonth(new Date(report.createdAt));
      monthBucket.submittedReports += 1;

      if (report.status === 'APPROVED') {
        monthBucket.approvedReports += 1;
      }
    });

    return Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, value]) => value);
  }

  private async getPersonalMetricsForRange(params: {
    projectId: string;
    userId: string;
    startDate: Date;
    endDate?: Date;
  }) {
    const now = new Date();

    const dateRangeFilter = params.endDate
      ? {
          gte: params.startDate,
          lte: params.endDate,
        }
      : {
          gte: params.startDate,
        };

    const tasks = await this.prisma.task.findMany({
      where: {
        projectId: params.projectId,
        assigneeId: params.userId,
        OR: [
          { createdAt: dateRangeFilter },
          { completedAt: dateRangeFilter },
          { dueDate: dateRangeFilter },
        ],
      },
      include: {
        status: true,
        complexity: true,
        reports: {
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    const assignedTasksCount = tasks.length;
    const completedTasks = tasks.filter((task) => task.completedAt);
    const completedTasksCount = completedTasks.length;

    const completedOnTimeCount = completedTasks.filter((task) => {
      if (!task.completedAt || !task.dueDate) return false;

      return (
        new Date(task.completedAt).getTime() <= new Date(task.dueDate).getTime()
      );
    }).length;

    const overdueTasksCount = tasks.filter((task) => {
      if (!task.dueDate) return false;

      if (task.completedAt) {
        return (
          new Date(task.completedAt).getTime() >
          new Date(task.dueDate).getTime()
        );
      }

      return new Date(task.dueDate).getTime() < now.getTime();
    }).length;

    const activeTasks = tasks.filter((task) => task.status?.name === 'In Progress');
    const activeTasksCount = activeTasks.length;

    const activeComplexityTotal = activeTasks.reduce(
      (sum, task) => sum + (task.complexity?.pointsValue ?? 0),
      0,
    );

    const activeComplexityAverage = activeTasksCount
      ? Number((activeComplexityTotal / activeTasksCount).toFixed(2))
      : 0;

    const submittedReports = await this.prisma.taskReport.findMany({
      where: {
        authorId: params.userId,
        task: {
          projectId: params.projectId,
        },
        createdAt: dateRangeFilter,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        taskId: true,
        status: true,
        createdAt: true,
      },
    });

    const reportsByTask = new Map<string, typeof submittedReports>();

    for (const report of submittedReports) {
      const current = reportsByTask.get(report.taskId) ?? [];
      current.push(report);
      reportsByTask.set(report.taskId, current);
    }

    let firstApprovalCount = 0;

    for (const [, reports] of reportsByTask.entries()) {
      if (reports.length > 0 && reports[0].status === 'APPROVED') {
        firstApprovalCount += 1;
      }
    }

    // ВАЖНО:
    // onTimeRate считаем от ВСЕХ задач периода, а не только от завершённых.
    const onTimeRate = this.calculateRate(
      completedOnTimeCount,
      assignedTasksCount,
    );

    const completionRate = this.calculateRate(
      completedTasksCount,
      assignedTasksCount,
    );

    const overdueRate = this.calculateRate(
      overdueTasksCount,
      assignedTasksCount,
    );

    const reportQuality = this.calculateRate(
      firstApprovalCount,
      reportsByTask.size,
    );

    const personalKpi = this.calculatePersonalKpi({
      onTimeRate,
      completionRate,
      firstApprovalRate: reportQuality,
    });

    return {
      tasks,
      completedTasks,
      assignedTasksCount,
      completedTasksCount,
      completedOnTimeCount,
      overdueTasksCount,
      activeTasksCount,
      activeComplexityTotal,
      activeComplexityAverage,
      reportsCount: submittedReports.length,
      onTimeRate,
      completionRate,
      overdueRate,
      reportQuality,
      personalKpi,
      isSampleSmall: assignedTasksCount < 5 || submittedReports.length < 3,
    };
  }

  private async getTeamMetricsForRange(params: {
    projectId: string;
    startDate: Date;
    endDate?: Date;
  }) {
    const now = new Date();

    const dateRangeFilter = params.endDate
      ? {
          gte: params.startDate,
          lte: params.endDate,
        }
      : {
          gte: params.startDate,
        };

    const tasks = await this.prisma.task.findMany({
      where: {
        projectId: params.projectId,
        OR: [
          { createdAt: dateRangeFilter },
          { completedAt: dateRangeFilter },
          { dueDate: dateRangeFilter },
        ],
      },
      include: {
        status: true,
        complexity: true,
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    const totalTasksCount = tasks.length;
    const completedTasks = tasks.filter((task) => task.completedAt);
    const completedTasksCount = completedTasks.length;

    const completedOnTimeCount = completedTasks.filter((task) => {
      if (!task.completedAt || !task.dueDate) return false;

      return (
        new Date(task.completedAt).getTime() <= new Date(task.dueDate).getTime()
      );
    }).length;

    const overdueTasksCount = tasks.filter((task) => {
      if (!task.dueDate) return false;

      if (task.completedAt) {
        return (
          new Date(task.completedAt).getTime() >
          new Date(task.dueDate).getTime()
        );
      }

      return new Date(task.dueDate).getTime() < now.getTime();
    }).length;

    const reports = await this.prisma.taskReport.findMany({
      where: {
        task: {
          projectId: params.projectId,
        },
        createdAt: dateRangeFilter,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        taskId: true,
        authorId: true,
        status: true,
        createdAt: true,
      },
    });

    const reportsByTask = new Map<string, typeof reports>();

    for (const report of reports) {
      const current = reportsByTask.get(report.taskId) ?? [];
      current.push(report);
      reportsByTask.set(report.taskId, current);
    }

    let firstApprovalCount = 0;

    for (const [, taskReports] of reportsByTask.entries()) {
      if (taskReports.length > 0 && taskReports[0].status === 'APPROVED') {
        firstApprovalCount += 1;
      }
    }

    // ВАЖНО:
    // onTimeRate считаем от ВСЕХ задач периода, а не только от завершённых.
    const onTimeRate = this.calculateRate(
      completedOnTimeCount,
      totalTasksCount,
    );

    const completionRate = this.calculateRate(
      completedTasksCount,
      totalTasksCount,
    );

    const overdueRate = this.calculateRate(overdueTasksCount, totalTasksCount);

    const reportQuality = this.calculateRate(
      firstApprovalCount,
      reportsByTask.size,
    );

    const teamKpi = this.calculateTeamKpi({
      onTimeRate,
      reportQuality,
      completionRate,
    });

    return {
      tasks,
      completedTasks,
      totalTasksCount,
      completedTasksCount,
      completedOnTimeCount,
      overdueTasksCount,
      reportsByTask,
      reportsCount: reports.length,
      onTimeRate,
      completionRate,
      overdueRate,
      reportQuality,
      teamKpi,
      isSampleSmall: totalTasksCount < 8 || reports.length < 5,
    };
  }

  async getPersonalAnalytics(
    projectId: string,
    userId: string,
    period: AnalyticsPeriod = '14d',
  ) {
    await this.ensureProjectAccess(projectId, userId);

    const fromDate = this.getPeriodStartDate(period);
    const previousStart = this.getPreviousPeriodStartDate(period);
    const previousEnd = this.getPreviousPeriodEndDate(period);
    const labels = this.buildDailyLabels(period);

    const currentMetrics = await this.getPersonalMetricsForRange({
      projectId,
      userId,
      startDate: fromDate,
    });

    const previousMetrics = await this.getPersonalMetricsForRange({
      projectId,
      userId,
      startDate: previousStart,
      endDate: previousEnd,
    });

    const completedTasksTrend = this.buildTrendPoints(
      labels,
      currentMetrics.completedTasks,
    );

    const statusDistribution = this.buildStatusDistribution(currentMetrics.tasks);

    const trends = {
      personalKpi: this.buildTrend(
        currentMetrics.personalKpi,
        previousMetrics.personalKpi,
      ),
      onTimeRate: this.buildTrend(
        currentMetrics.onTimeRate,
        previousMetrics.onTimeRate,
      ),
      overdueRate: this.buildTrend(
        currentMetrics.overdueRate,
        previousMetrics.overdueRate,
      ),
      reportQuality: this.buildTrend(
        currentMetrics.reportQuality,
        previousMetrics.reportQuality,
      ),
    };

    const insights = this.buildInsightsForPersonal({
      personalKpi: currentMetrics.personalKpi,
      onTimeRate: currentMetrics.onTimeRate,
      overdueRate: currentMetrics.overdueRate,
      reportQuality: currentMetrics.reportQuality,
      activeTasksCount: currentMetrics.activeTasksCount,
      isSampleSmall: currentMetrics.isSampleSmall,
    });

    const primaryInsight = this.buildPrimaryInsightForPersonal({
      personalKpi: currentMetrics.personalKpi,
      onTimeRate: currentMetrics.onTimeRate,
      overdueRate: currentMetrics.overdueRate,
      reportQuality: currentMetrics.reportQuality,
      activeTasksCount: currentMetrics.activeTasksCount,
      trends: {
        personalKpi: this.buildTrend(
          currentMetrics.personalKpi,
          previousMetrics.personalKpi,
        ),
        onTimeRate: this.buildTrend(
          currentMetrics.onTimeRate,
          previousMetrics.onTimeRate,
        ),
        overdueRate: this.buildTrend(
          currentMetrics.overdueRate,
          previousMetrics.overdueRate,
        ),
        reportQuality: this.buildTrend(
          currentMetrics.reportQuality,
          previousMetrics.reportQuality,
        ),
      },
      isSampleSmall: currentMetrics.isSampleSmall,
    });

    return {
      period,
      summary: {
        personalKpi: currentMetrics.personalKpi,
        onTimeRate: currentMetrics.onTimeRate,
        completionRate: currentMetrics.completionRate,
        overdueRate: currentMetrics.overdueRate,
        reportQuality: currentMetrics.reportQuality,
        activeTasksCount: currentMetrics.activeTasksCount,
        activeComplexityTotal: currentMetrics.activeComplexityTotal,
        activeComplexityAverage: currentMetrics.activeComplexityAverage,
        trends: {
          personalKpi: this.buildTrend(
            currentMetrics.personalKpi,
            previousMetrics.personalKpi,
          ),
          onTimeRate: this.buildTrend(
            currentMetrics.onTimeRate,
            previousMetrics.onTimeRate,
          ),
          overdueRate: this.buildTrend(
            currentMetrics.overdueRate,
            previousMetrics.overdueRate,
          ),
          reportQuality: this.buildTrend(
            currentMetrics.reportQuality,
            previousMetrics.reportQuality,
          ),
        },
        sample: {
          tasksCount: currentMetrics.assignedTasksCount,
          reportsCount: currentMetrics.reportsCount,
          isSmall: currentMetrics.isSampleSmall,
        },
      },
      charts: {
        completedTasksTrend,
        statusDistribution,
      },
      primaryInsight,
      insights,
    };
  }

  async getTeamAnalytics(
    projectId: string,
    userId: string,
    period: AnalyticsPeriod = '14d',
  ) {
    const membership = await this.ensureProjectAccess(projectId, userId);

    if (
      membership.roleInProject !== 'OWNER' &&
      membership.roleInProject !== 'MANAGER'
    ) {
      throw new ForbiddenException('Only managers can view team analytics');
    }

    const fromDate = this.getPeriodStartDate(period);
    const previousStart = this.getPreviousPeriodStartDate(period);
    const previousEnd = this.getPreviousPeriodEndDate(period);
    const labels = this.buildDailyLabels(period);
    const now = new Date();

    const currentMetrics = await this.getTeamMetricsForRange({
      projectId,
      startDate: fromDate,
    });

    const previousMetrics = await this.getTeamMetricsForRange({
      projectId,
      startDate: previousStart,
      endDate: previousEnd,
    });

    const teamCompletedTrend = this.buildTrendPoints(
      labels,
      currentMetrics.completedTasks,
    );

    const statusDistribution = this.buildStatusDistribution(currentMetrics.tasks);

    const membersMap = new Map<
      string,
      {
        employeeId: string;
        fullName: string;
        totaltasks: number;
        activeTasks: number;
        completedTasks: number;
        complexityPoints: number;
        overdueTasks: number;
        onTimeCompleted: number;
        reportTasks: Set<string>;
        firstApprovedTasks: Set<string>;
      }
    >();

    for (const task of currentMetrics.tasks) {
      if (!task.assignee) continue;

      const current = membersMap.get(task.assignee.id) ?? {
        employeeId: task.assignee.id,
        fullName: task.assignee.fullName,
        totaltasks: 0,
        activeTasks: 0,
        completedTasks: 0,
        complexityPoints: 0,
        overdueTasks: 0,
        onTimeCompleted: 0,
        reportTasks: new Set<string>(),
        firstApprovedTasks: new Set<string>(),
      };
      current.totaltasks += 1;

      if (task.status?.name === 'In Progress') {
        current.activeTasks += 1;
        current.complexityPoints += task.complexity?.pointsValue ?? 0;
      }

      if (task.completedAt) {
        current.completedTasks += 1;
      }

      const isOverdue = task.dueDate
        ? task.completedAt
          ? new Date(task.completedAt).getTime() >
            new Date(task.dueDate).getTime()
          : new Date(task.dueDate).getTime() < now.getTime()
        : false;

      if (isOverdue) {
        current.overdueTasks += 1;
      }

      const completedOnTime =
        task.completedAt && task.dueDate
          ? new Date(task.completedAt).getTime() <=
            new Date(task.dueDate).getTime()
          : false;

      if (completedOnTime) {
        current.onTimeCompleted += 1;
      }

      const taskReports = currentMetrics.reportsByTask.get(task.id) ?? [];
      if (taskReports.length) {
        current.reportTasks.add(task.id);
        if (taskReports[0].status === 'APPROVED') {
          current.firstApprovedTasks.add(task.id);
        }
      }

      membersMap.set(task.assignee.id, current);
    }

    const workloadByMembers = Array.from(membersMap.values()).map((member) => ({
      employeeId: member.employeeId,
      fullName: member.fullName,
      activeTasks: member.activeTasks,
      completedTasks: member.completedTasks,
      complexityPoints: member.complexityPoints,
    }));

    const membersRisk = Array.from(membersMap.values()).map((member) => {
      const memberOnTimeRate = this.calculateRate(
        member.onTimeCompleted,
        member.totaltasks,
      );
      const memberOverdueRate = this.calculateRate(
        member.overdueTasks,
        member.totaltasks,
      );
      const memberReportQuality = this.calculateRate(
        member.firstApprovedTasks.size,
        member.reportTasks.size,
      );
      const memberComletionRate = this.calculateRate(
        member.completedTasks,
        member.totaltasks,
      );

      const personalKpi = this.calculatePersonalKpi({
        onTimeRate: memberOnTimeRate,
        completionRate: memberComletionRate,
        firstApprovalRate: memberReportQuality,
      });

      return {
        employeeId: member.employeeId,
        fullName: member.fullName,
        riskLevel: this.detectRiskLevel({
          overdueRate: memberOverdueRate,
          onTimeRate: memberOnTimeRate,
          activeTasks: member.activeTasks,
        }),
        personalKpi,
        overdueRate: memberOverdueRate,
        onTimeRate: memberOnTimeRate,
      };
    });

    const leaderboard = [...membersRisk]
      .sort((a, b) => b.personalKpi - a.personalKpi)
      .map((member) => ({
        employeeId: member.employeeId,
        fullName: member.fullName,
        personalKpi: member.personalKpi,
      }));

    const highRiskCount = membersRisk.filter(
      (member) => member.riskLevel === 'high',
    ).length;

    const insights = this.buildInsightsForTeam({
      teamKpi: currentMetrics.teamKpi,
      onTimeRate: currentMetrics.onTimeRate,
      overdueRate: currentMetrics.overdueRate,
      reportQuality: currentMetrics.reportQuality,
      highRiskCount,
      isSampleSmall: currentMetrics.isSampleSmall,
    });

    return {
      period,
      summary: {
        teamKpi: currentMetrics.teamKpi,
        onTimeRate: currentMetrics.onTimeRate,
        completionRate: currentMetrics.completionRate,
        overdueRate: currentMetrics.overdueRate,
        reportQuality: currentMetrics.reportQuality,
        completedTasksCount: currentMetrics.completedTasksCount,
        trends: {
          teamKpi: this.buildTrend(
            currentMetrics.teamKpi,
            previousMetrics.teamKpi,
          ),
          onTimeRate: this.buildTrend(
            currentMetrics.onTimeRate,
            previousMetrics.onTimeRate,
          ),
          overdueRate: this.buildTrend(
            currentMetrics.overdueRate,
            previousMetrics.overdueRate,
          ),
          reportQuality: this.buildTrend(
            currentMetrics.reportQuality,
            previousMetrics.reportQuality,
          ),
        },
        sample: {
          tasksCount: currentMetrics.totalTasksCount,
          reportsCount: currentMetrics.reportsCount,
          isSmall: currentMetrics.isSampleSmall,
        },
      },
      charts: {
        teamCompletedTrend,
        statusDistribution,
        workloadByMembers,
      },
      membersRisk,
      leaderboard,
      insights,
    };
  }

  async getMonthlyTeamSummary(projectId: string, userId: string) {
    const membership = await this.ensureProjectAccess(projectId, userId);

    if (
      membership.roleInProject !== 'OWNER' &&
      membership.roleInProject !== 'MANAGER'
    ) {
      throw new ForbiddenException('Only managers can view team monthly analytics');
    }

    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 5);
    fromDate.setDate(1);
    fromDate.setHours(0, 0, 0, 0);

    const tasks = await this.prisma.task.findMany({
      where: {
        projectId,
        OR: [
          {
            completedAt: {
              gte: fromDate,
            },
          },
          {
            dueDate: {
              gte: fromDate,
            },
          },
        ],
      },
      select: {
        id: true,
        dueDate: true,
        completedAt: true,
      },
    });

    const reports = await this.prisma.taskReport.findMany({
      where: {
        task: {
          projectId,
        },
        createdAt: {
          gte: fromDate,
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    return this.buildMonthlySummary(tasks, reports);
  }

  async getMonthlyPersonalSummary(projectId: string, userId: string) {
    await this.ensureProjectAccess(projectId, userId);

    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 5);
    fromDate.setDate(1);
    fromDate.setHours(0, 0, 0, 0);

    const tasks = await this.prisma.task.findMany({
      where: {
        projectId,
        assigneeId: userId,
        OR: [
          {
            completedAt: {
              gte: fromDate,
            },
          },
          {
            dueDate: {
              gte: fromDate,
            },
          },
        ],
      },
      select: {
        id: true,
        dueDate: true,
        completedAt: true,
      },
    });

    const reports = await this.prisma.taskReport.findMany({
      where: {
        authorId: userId,
        task: {
          projectId,
        },
        createdAt: {
          gte: fromDate,
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    return this.buildMonthlySummary(tasks, reports);
  }
}

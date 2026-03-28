import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type AnalyticsPeriod = '7d' | '14d' | '30d';

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
    if (!total) return 0;
    return Math.round((part / total) * 100);
  }

  private calculatePersonalKpi(params: {
    onTimeRate: number;
    completionRate: number;
    firstApprovalRate: number;
    disciplineRate: number;
  }) {
    const result =
      params.onTimeRate * 0.4 +
      params.completionRate * 0.25 +
      params.firstApprovalRate * 0.2 +
      params.disciplineRate * 0.15;

    return Math.round(result);
  }

  private calculateTeamKpi(params: {
    onTimeRate: number;
    reportQuality: number;
    completionRate: number;
    disciplineRate: number;
  }) {
    const result =
      params.onTimeRate * 0.35 +
      params.reportQuality * 0.2 +
      params.completionRate * 0.25 +
      params.disciplineRate * 0.2;

    return Math.round(result);
  }

  private detectRiskLevel(params: {
    overdueRate: number;
    onTimeRate: number;
    activeTasks: number;
  }): 'low' | 'medium' | 'high' {
    if (
      params.overdueRate > 25 ||
      params.onTimeRate < 50 ||
      params.activeTasks >= 6
    ) {
      return 'high';
    }

    if (
      params.overdueRate >= 10 ||
      params.onTimeRate < 75 ||
      params.activeTasks >= 4
    ) {
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
  }) {
    const insights: string[] = [];

    if (params.personalKpi >= 80) {
      insights.push('Вы демонстрируете высокий уровень личной эффективности.');
    } else if (params.personalKpi >= 60) {
      insights.push('Ваш показатель эффективности находится на стабильном уровне.');
    } else {
      insights.push('Личный KPI ниже целевого уровня. Требуется улучшение дисциплины и темпа выполнения.');
    }

    if (params.onTimeRate >= 80) {
      insights.push('Вы стабильно закрываете задачи в срок.');
    } else if (params.onTimeRate < 50) {
      insights.push('Есть выраженный риск по соблюдению сроков выполнения задач.');
    }

    if (params.reportQuality >= 80) {
      insights.push('Качество ваших отчётов находится на высоком уровне.');
    } else if (params.reportQuality < 50) {
      insights.push('Часть отчётов требует доработки. Есть потенциал улучшения качества сдачи результата.');
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
  }) {
    const insights: string[] = [];

    if (params.teamKpi >= 80) {
      insights.push('Команда демонстрирует высокий общий уровень эффективности.');
    } else if (params.teamKpi >= 60) {
      insights.push('Команда работает стабильно, но есть точки роста по исполнительской дисциплине.');
    } else {
      insights.push('Командный KPI ниже целевого уровня. Требуются управленческие корректировки.');
    }

    if (params.onTimeRate >= 75) {
      insights.push('Темп выполнения задач и соблюдение сроков находятся на хорошем уровне.');
    } else if (params.onTimeRate < 50) {
      insights.push('Основная зона риска — низкая доля задач, завершённых в срок.');
    }

    if (params.reportQuality >= 80) {
      insights.push('Качество отчётов команды остаётся на высоком уровне.');
    } else if (params.reportQuality < 50) {
      insights.push('Часть отчётов требует доработки, что снижает общую скорость выполнения.');
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

  async getPersonalAnalytics(projectId: string, userId: string, period: AnalyticsPeriod = '14d') {
    await this.ensureProjectAccess(projectId, userId);

    const fromDate = this.getPeriodStartDate(period);
    const labels = this.buildDailyLabels(period);
    const now = new Date();

    const tasks = await this.prisma.task.findMany({
      where: {
        projectId,
        assigneeId: userId,
        OR: [
          {
            createdAt: {
              gte: fromDate,
            },
          },
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
      return new Date(task.completedAt).getTime() <= new Date(task.dueDate).getTime();
    }).length;

    const overdueTasksCount = tasks.filter((task) => {
      if (!task.dueDate) return false;

      if (task.completedAt) {
        return new Date(task.completedAt).getTime() > new Date(task.dueDate).getTime();
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
        authorId: userId,
        task: {
          projectId,
        },
        createdAt: {
          gte: fromDate,
        },
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

    const onTimeRate = this.calculateRate(completedOnTimeCount, completedTasksCount);
    const completionRate = this.calculateRate(completedTasksCount, assignedTasksCount);
    const overdueRate = this.calculateRate(overdueTasksCount, assignedTasksCount);
    const firstApprovalRate = this.calculateRate(
      firstApprovalCount,
      reportsByTask.size,
    );
    const disciplineRate = Math.max(0, 100 - overdueRate);

    const personalKpi = this.calculatePersonalKpi({
      onTimeRate,
      completionRate,
      firstApprovalRate,
      disciplineRate,
    });

    const trendMap = new Map<string, number>();
    labels.forEach((label) => trendMap.set(label, 0));

    completedTasks.forEach((task) => {
      if (!task.completedAt) return;
      const label = this.formatDayLabel(new Date(task.completedAt));
      if (trendMap.has(label)) {
        trendMap.set(label, (trendMap.get(label) ?? 0) + 1);
      }
    });

    const completedTasksTrend = labels.map((label) => ({
      label,
      value: trendMap.get(label) ?? 0,
    }));

    const statusDistribution = [
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
            return new Date(task.completedAt).getTime() > new Date(task.dueDate).getTime();
          }
          return new Date(task.dueDate).getTime() < now.getTime();
        }).length,
      },
    ];

    const insights = this.buildInsightsForPersonal({
      personalKpi,
      onTimeRate,
      overdueRate,
      reportQuality: firstApprovalRate,
      activeTasksCount,
    });

    return {
      period,
      summary: {
        personalKpi,
        onTimeRate,
        completionRate,
        overdueRate,
        reportQuality: firstApprovalRate,
        activeTasksCount,
        activeComplexityTotal,
        activeComplexityAverage,
      },
      charts: {
        completedTasksTrend,
        statusDistribution,
      },
      insights,
    };
  }

  async getTeamAnalytics(projectId: string, userId: string, period: AnalyticsPeriod = '14d') {
    const membership = await this.ensureProjectAccess(projectId, userId);

    if (
      membership.roleInProject !== 'OWNER' &&
      membership.roleInProject !== 'MANAGER'
    ) {
      throw new ForbiddenException('Only managers can view team analytics');
    }

    const fromDate = this.getPeriodStartDate(period);
    const labels = this.buildDailyLabels(period);
    const now = new Date();

    const tasks = await this.prisma.task.findMany({
      where: {
        projectId,
        OR: [
          {
            createdAt: {
              gte: fromDate,
            },
          },
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
      return new Date(task.completedAt).getTime() <= new Date(task.dueDate).getTime();
    }).length;

    const overdueTasksCount = tasks.filter((task) => {
      if (!task.dueDate) return false;

      if (task.completedAt) {
        return new Date(task.completedAt).getTime() > new Date(task.dueDate).getTime();
      }

      return new Date(task.dueDate).getTime() < now.getTime();
    }).length;

    const reports = await this.prisma.taskReport.findMany({
      where: {
        task: {
          projectId,
        },
        createdAt: {
          gte: fromDate,
        },
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

    const onTimeRate = this.calculateRate(completedOnTimeCount, completedTasksCount);
    const completionRate = this.calculateRate(completedTasksCount, totalTasksCount);
    const overdueRate = this.calculateRate(overdueTasksCount, totalTasksCount);
    const reportQuality = this.calculateRate(firstApprovalCount, reportsByTask.size);
    const disciplineRate = Math.max(0, 100 - overdueRate);

    const teamKpi = this.calculateTeamKpi({
      onTimeRate,
      reportQuality,
      completionRate,
      disciplineRate,
    });

    const trendMap = new Map<string, number>();
    labels.forEach((label) => trendMap.set(label, 0));

    completedTasks.forEach((task) => {
      if (!task.completedAt) return;
      const label = this.formatDayLabel(new Date(task.completedAt));
      if (trendMap.has(label)) {
        trendMap.set(label, (trendMap.get(label) ?? 0) + 1);
      }
    });

    const teamCompletedTrend = labels.map((label) => ({
      label,
      value: trendMap.get(label) ?? 0,
    }));

    const statusDistribution = [
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
            return new Date(task.completedAt).getTime() > new Date(task.dueDate).getTime();
          }
          return new Date(task.dueDate).getTime() < now.getTime();
        }).length,
      },
    ];

    const membersMap = new Map<
      string,
      {
        employeeId: string;
        fullName: string;
        activeTasks: number;
        completedTasks: number;
        complexityPoints: number;
        overdueTasks: number;
        onTimeCompleted: number;
        reportTasks: Set<string>;
        firstApprovedTasks: Set<string>;
      }
    >();

    for (const task of tasks) {
      if (!task.assignee) continue;

      const current =
        membersMap.get(task.assignee.id) ??
        {
          employeeId: task.assignee.id,
          fullName: task.assignee.fullName,
          activeTasks: 0,
          completedTasks: 0,
          complexityPoints: 0,
          overdueTasks: 0,
          onTimeCompleted: 0,
          reportTasks: new Set<string>(),
          firstApprovedTasks: new Set<string>(),
        };

      if (task.status?.name === 'In Progress') {
        current.activeTasks += 1;
        current.complexityPoints += task.complexity?.pointsValue ?? 0;
      }

      if (task.completedAt) {
        current.completedTasks += 1;
      }

      const isOverdue = task.dueDate
        ? task.completedAt
          ? new Date(task.completedAt).getTime() > new Date(task.dueDate).getTime()
          : new Date(task.dueDate).getTime() < now.getTime()
        : false;

      if (isOverdue) {
        current.overdueTasks += 1;
      }

      const completedOnTime =
        task.completedAt && task.dueDate
          ? new Date(task.completedAt).getTime() <= new Date(task.dueDate).getTime()
          : false;

      if (completedOnTime) {
        current.onTimeCompleted += 1;
      }

      const taskReports = reportsByTask.get(task.id) ?? [];
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
        member.completedTasks,
      );
      const memberOverdueRate = this.calculateRate(
        member.overdueTasks,
        member.completedTasks + member.activeTasks,
      );
      const memberReportQuality = this.calculateRate(
        member.firstApprovedTasks.size,
        member.reportTasks.size,
      );
      const memberDisciplineRate = Math.max(0, 100 - memberOverdueRate);

      const personalKpi = this.calculatePersonalKpi({
        onTimeRate: memberOnTimeRate,
        completionRate: this.calculateRate(
          member.completedTasks,
          member.completedTasks + member.activeTasks,
        ),
        firstApprovalRate: memberReportQuality,
        disciplineRate: memberDisciplineRate,
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
      teamKpi,
      onTimeRate,
      overdueRate,
      reportQuality,
      highRiskCount,
    });

    return {
      period,
      summary: {
        teamKpi,
        onTimeRate,
        completionRate,
        overdueRate,
        reportQuality,
        completedTasksCount,
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

  async getMonthlySummary(projectId: string, userId: string) {
    await this.ensureProjectAccess(projectId, userId);

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
        if (new Date(task.completedAt).getTime() > new Date(task.dueDate).getTime()) {
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
}
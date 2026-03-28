import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationEntityType, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);
  private readonly DEADLINE_REMINDER_DAYS = [14, 7, 5, 3, 1];

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Для тестов можно временно заменить на:
   * @Cron(CronExpression.EVERY_MINUTE)
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleTaskDeadlineNotifications() {
    this.logger.log('Running deadline notification job...');

    const now = new Date();

    const tasks = await this.prisma.task.findMany({
      where: {
        dueDate: {
          not: null,
        },
        isArchived: false,
        assigneeId: {
          not: null,
        },
        status: {
          isFinal: false,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    for (const task of tasks) {
      if (!task.dueDate || !task.assigneeId || !task.assignee) continue;

      const dueDate = new Date(task.dueDate);

      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const startOfDueDate = new Date(
        dueDate.getFullYear(),
        dueDate.getMonth(),
        dueDate.getDate(),
      );

      const diffMs = startOfDueDate.getTime() - startOfToday.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      const assigneeName = task.assignee?.fullName ?? 'Неизвестный сотрудник';

      // 1) Напоминания до дедлайна
      if (this.DEADLINE_REMINDER_DAYS.includes(diffDays)) {
        const alreadyNotifiedDays = task.deadlineNotifiedDays ?? [];

        if (!alreadyNotifiedDays.includes(diffDays)) {
          await this.notificationService.createNotification({
            userId: task.assigneeId,
            title: 'Приближается дедлайн',
            message: `До дедлайна задачи «${task.title}» по проекту «${task.project.name}» осталось ${this.formatDays(diffDays)}.`,
            type: NotificationType.TASK_DEADLINE_SOON,
            entityType: NotificationEntityType.TASK,
            entityId: task.id,
            projectId: task.projectId,
            actionUrl: `/projects/${task.projectId}/dashboard`,
            meta: {
              taskId: task.id,
              taskTitle: task.title,
              projectName: task.project.name,
              daysLeft: diffDays,
              dueDate: task.dueDate,
              assigneeId: task.assigneeId,
              assigneeName: task.assignee.fullName,
            },
          });

          await this.prisma.task.update({
            where: { id: task.id },
            data: {
              deadlineNotifiedDays: {
                push: diffDays,
              },
            },
          });

          this.logger.log(
            `Deadline reminder sent for task "${task.title}" (${diffDays} day(s) left)`,
          );
        }
      }

      // 2) Уведомление о просрочке
      if (diffDays < 0 && !task.overdueNotified) {
        // Исполнителю
        await this.notificationService.createNotification({
          userId: task.assigneeId,
          title: 'Задача просрочена',
          message: `По задаче «${task.title}» по проекту «${task.project.name}» дедлайн уже истёк.`,
          type: NotificationType.TASK_OVERDUE,
          entityType: NotificationEntityType.TASK,
          entityId: task.id,
          projectId: task.projectId,
          actionUrl: `/projects/${task.projectId}/dashboard`,
          meta: {
            taskId: task.id,
            taskTitle: task.title,
            projectName: task.project.name,
            dueDate: task.dueDate,
            assigneeId: task.assigneeId,
            assigneeName: task.assignee.fullName,
          },
        });

        // Менеджерам / руководителям проекта
        const managers = await this.prisma.projectMember.findMany({
          where: {
            projectId: task.projectId,
            roleInProject: {
              in: ['OWNER', 'MANAGER'],
            },
          },
          select: {
            userId: true,
          },
        });

        if (managers.length) {
          await this.notificationService.createManyNotifications(
            managers.map((manager) => ({
              userId: manager.userId,
              title: 'Задача просрочена',
              message: `Задача «${task.title}» по проекту «${task.project.name}» просрочена.`,
              type: NotificationType.TASK_OVERDUE,
              entityType: NotificationEntityType.TASK,
              entityId: task.id,
              projectId: task.projectId,
              actionUrl: `/projects/${task.projectId}/dashboard`,
              meta: {
                taskId: task.id,
                taskTitle: task.title,
                projectName: task.project.name,
                assigneeId: task.assigneeId,
                assigneeName: assigneeName,
                dueDate: task.dueDate,
              },
            })),
          );
        }

        await this.prisma.task.update({
          where: { id: task.id },
          data: {
            overdueNotified: true,
          },
        });

        this.logger.log(`Overdue notifications sent for task "${task.title}"`);
      }
    }
  }

  private formatDays(days: number) {
    if (days === 1) return '1 день';
    if (days >= 2 && days <= 4) return `${days} дня`;
    return `${days} дней`;
  }
}

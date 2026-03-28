import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  TaskArchiveReason,
  NotificationEntityType,
  NotificationType,
  ProjectRole,
} from '@prisma/client';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private async notifyTaskAssigned(params: {
    assigneeId: string;
    taskId: string;
    taskTitle: string;
    projectId: string;
    projectName: string;
  }) {
    await this.notificationService.createNotification({
      userId: params.assigneeId,
      title: 'Вам назначена новая задача',
      message: `Вам назначена новая задача «${params.taskTitle}» по проекту «${params.projectName}».`,
      type: NotificationType.TASK_ASSIGNED,
      entityType: NotificationEntityType.TASK,
      entityId: params.taskId,
      projectId: params.projectId,
      actionUrl: `/projects/${params.projectId}/dashboard`,
      meta: {
        taskId: params.taskId,
        taskTitle: params.taskTitle,
        projectName: params.projectName,
      },
    });
  }

  private async notifyTaskUpdated(params: {
    assigneeId: string;
    taskId: string;
    taskTitle: string;
    projectId: string;
    projectName: string;
    managerFullName: string;
  }) {
    await this.notificationService.createNotification({
      userId: params.assigneeId,
      title: 'Задача обновлена',
      message: `Менеджер/руководитель ${params.managerFullName} внёс правки в задачу «${params.taskTitle}» по проекту «${params.projectName}». Просмотрите обновлённую задачу.`,
      type: NotificationType.TASK_UPDATED,
      entityType: NotificationEntityType.TASK,
      entityId: params.taskId,
      projectId: params.projectId,
      actionUrl: `/projects/${params.projectId}/dashboard`,
      meta: {
        taskId: params.taskId,
        taskTitle: params.taskTitle,
        projectName: params.projectName,
        managerFullName: params.managerFullName,
      },
    });
  }

  private hasImportantTaskChanges(
    oldTask: {
      title?: string | null;
      description?: string | null;
      dueDate?: Date | null;
      priorityId?: string | null;
      complexityId?: string | null;
      reportType?: string | null;
      requiresReport?: boolean | null;
    },
    updateData: {
      title?: string;
      description?: string | null;
      dueDate?: Date | null;
      priorityId?: string;
      complexityId?: string;
      reportType?: string | null;
      requiresReport?: boolean;
    },
  ) {
    const dueDateChanged =
      typeof updateData.dueDate !== 'undefined' &&
      (oldTask.dueDate?.getTime?.() ?? null) !==
        (updateData.dueDate?.getTime?.() ?? null);

    return (
      (typeof updateData.title !== 'undefined' &&
        updateData.title !== oldTask.title) ||
      (typeof updateData.description !== 'undefined' &&
        updateData.description !== oldTask.description) ||
      dueDateChanged ||
      (typeof updateData.priorityId !== 'undefined' &&
        updateData.priorityId !== oldTask.priorityId) ||
      (typeof updateData.complexityId !== 'undefined' &&
        updateData.complexityId !== oldTask.complexityId) ||
      (typeof updateData.reportType !== 'undefined' &&
        updateData.reportType !== oldTask.reportType) ||
      (typeof updateData.requiresReport !== 'undefined' &&
        updateData.requiresReport !== oldTask.requiresReport)
    );
  }

  private async notifyManagersTaskStarted(params: {
    projectId: string;
    taskId: string;
    taskTitle: string;
    projectName: string;
    employeeId: string;
    employeeFullName: string;
  }) {
    console.log('notifyManagersTaskStarted called with:', params);

    const managers = await this.prisma.projectMember.findMany({
      where: {
        projectId: params.projectId,
        roleInProject: {
          in: [ProjectRole.OWNER, ProjectRole.MANAGER],
        },
        userId: {
          not: params.employeeId,
        },
      },
      select: {
        userId: true,
        roleInProject: true,
      },
    });

    console.log('notifyManagersTaskStarted managers:', managers);

    if (!managers.length) {
      console.log('No managers found for TASK_STARTED notification');
      return;
    }

    const result = await this.notificationService.createManyNotifications(
      managers.map((manager) => ({
        userId: manager.userId,
        title: 'Задача взята в работу',
        message: `Сотрудник ${params.employeeFullName} взял в работу задачу «${params.taskTitle}» по проекту «${params.projectName}».`,
        type: NotificationType.TASK_STARTED,
        entityType: NotificationEntityType.TASK,
        entityId: params.taskId,
        projectId: params.projectId,
        actionUrl: `/projects/${params.projectId}/dashboard`,
        meta: {
          taskId: params.taskId,
          taskTitle: params.taskTitle,
          employeeId: params.employeeId,
          employeeFullName: params.employeeFullName,
          projectName: params.projectName,
        },
      })),
    );

    console.log('TASK_STARTED notifications created:', result);
  }

  async createTask(userId: string, dto: CreateTaskDto) {
    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: dto.projectId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this project');
    }

    if (
      membership.roleInProject !== 'OWNER' &&
      membership.roleInProject !== 'MANAGER'
    ) {
      throw new ForbiddenException('Only managers can create tasks');
    }

    if (dto.requiresReport && !dto.reportType) {
      throw new ForbiddenException(
        'Report type is required when report is enabled',
      );
    }

    const createdTask = await this.prisma.task.create({
      data: {
        projectId: dto.projectId,
        statusId: dto.statusId,
        priorityId: dto.priorityId,
        complexityId: dto.complexityId,
        assigneeId: dto.assigneeId,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        requiresReport: dto.requiresReport,
        reportType: dto.requiresReport ? dto.reportType : null,
      },
      include: {
        status: true,
        priority: true,
        complexity: true,
        assignee: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (createdTask.assigneeId && createdTask.project) {
      await this.notifyTaskAssigned({
        assigneeId: createdTask.assigneeId,
        taskId: createdTask.id,
        taskTitle: createdTask.title,
        projectId: createdTask.projectId,
        projectName: createdTask.project.name,
      });
    }

    return createdTask;
  }

  private async archiveExpiredCompletedTasks(projectId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const doneStatus = await this.prisma.taskStatus.findFirst({
      where: { name: 'Done' },
    });

    if (!doneStatus) return;

    await this.prisma.task.updateMany({
      where: {
        projectId,
        isArchived: false,
        statusId: doneStatus.id,
        completedAt: {
          not: null,
          lte: sevenDaysAgo,
        },
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archiveReason: TaskArchiveReason.COMPLETED,
      },
    });
  }

  async getProjectTasks(projectId: string, userId: string) {
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

    await this.archiveExpiredCompletedTasks(projectId);

    return this.prisma.task.findMany({
      where: {
        projectId,
        isArchived: false,
      },
      include: {
        status: true,
        priority: true,
        complexity: true,
        assignee: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getArchivedProjectTasks(projectId: string, userId: string) {
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

    return this.prisma.task.findMany({
      where: {
        projectId,
        isArchived: true,
      },
      include: {
        status: true,
        priority: true,
        complexity: true,
        assignee: true,
        archivedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        archivedAt: 'desc',
      },
    });
  }

  async getStatuses() {
    return this.prisma.taskStatus.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getPriorities() {
    return this.prisma.taskPriority.findMany({
      orderBy: { weight: 'asc' },
    });
  }

  async getComplexities() {
    return this.prisma.taskComplexity.findMany({
      orderBy: { pointsValue: 'asc' },
    });
  }

  async updateTask(taskId: string, userId: string, dto: UpdateTaskDto) {
    const existingTask = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        status: true,
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: existingTask.projectId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied');
    }

    if (existingTask.isArchived) {
      throw new ForbiddenException('Archived task cannot be edited');
    }

    if (
      membership.roleInProject === 'MEMBER' &&
      existingTask.assigneeId !== userId
    ) {
      throw new ForbiddenException(
        'Members can update only their assigned tasks',
      );
    }

    if (dto.assigneeId && membership.roleInProject === 'MEMBER') {
      throw new ForbiddenException('Members cannot reassign tasks');
    }

    if (
      dto.requiresReport === true &&
      !dto.reportType &&
      !existingTask.reportType
    ) {
      throw new ForbiddenException(
        'Report type is required when report is enabled',
      );
    }

    let completedAtValue: Date | null | undefined = undefined;

    if (dto.statusId) {
      const newStatus = await this.prisma.taskStatus.findUnique({
        where: { id: dto.statusId },
      });

      if (!newStatus) {
        throw new NotFoundException('Status not found');
      }

      if (newStatus.name === 'Done') {
        if (existingTask.requiresReport || dto.requiresReport === true) {
          const approvedReport = await this.prisma.taskReport.findFirst({
            where: {
              taskId: existingTask.id,
              status: 'APPROVED',
            },
            orderBy: {
              reviewedAt: 'desc',
            },
          });

          if (!approvedReport) {
            throw new ForbiddenException(
              'Task cannot be marked as completed until the report is approved',
            );
          }
        }

        completedAtValue = existingTask.completedAt ?? new Date();
      } else {
        completedAtValue = null;
      }
    }

    const resolvedRequiresReport =
      dto.requiresReport !== undefined
        ? dto.requiresReport
        : existingTask.requiresReport;

    const updateData = {
      ...dto,
      dueDate:
        dto.dueDate !== undefined
          ? dto.dueDate
            ? new Date(dto.dueDate)
            : null
          : undefined,
      completedAt: completedAtValue,
      requiresReport: resolvedRequiresReport,
      reportType:
        resolvedRequiresReport === false
          ? null
          : dto.reportType !== undefined
            ? dto.reportType
            : undefined,
    };

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        status: true,
        priority: true,
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

    const manager = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
      },
    });

    if (
      updatedTask.assigneeId &&
      updatedTask.assigneeId !== existingTask.assigneeId &&
      updatedTask.project
    ) {
      await this.notifyTaskAssigned({
        assigneeId: updatedTask.assigneeId,
        taskId: updatedTask.id,
        taskTitle: updatedTask.title,
        projectId: updatedTask.projectId,
        projectName: updatedTask.project.name,
      });
    }

    const importantChanges = this.hasImportantTaskChanges(existingTask, {
      title: typeof dto.title !== 'undefined' ? dto.title : undefined,
      description:
        typeof dto.description !== 'undefined' ? dto.description : undefined,
      dueDate:
        typeof dto.dueDate !== 'undefined'
          ? dto.dueDate
            ? new Date(dto.dueDate)
            : null
          : undefined,
      priorityId:
        typeof dto.priorityId !== 'undefined' ? dto.priorityId : undefined,
      complexityId:
        typeof dto.complexityId !== 'undefined' ? dto.complexityId : undefined,
      reportType:
        typeof dto.reportType !== 'undefined' ? dto.reportType : undefined,
      requiresReport:
        typeof dto.requiresReport !== 'undefined'
          ? dto.requiresReport
          : undefined,
    });

    if (
      importantChanges &&
      updatedTask.assigneeId &&
      manager &&
      updatedTask.project
    ) {
      await this.notifyTaskUpdated({
        assigneeId: updatedTask.assigneeId,
        taskId: updatedTask.id,
        taskTitle: updatedTask.title,
        projectId: updatedTask.projectId,
        projectName: updatedTask.project.name,
        managerFullName: manager.fullName,
      });
    }

    return updatedTask;
  }

  async startTask(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        status: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.isArchived) {
      throw new ForbiddenException('Archived task cannot be started');
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: task.projectId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied');
    }

    if (task.assigneeId !== userId) {
      throw new ForbiddenException('Only assigned employee can start the task');
    }

    if (task.status.name !== 'Todo') {
      throw new ForbiddenException('Only tasks in Todo status can be started');
    }

    const inProgressStatus = await this.prisma.taskStatus.findFirst({
      where: { name: 'In Progress' },
    });

    if (!inProgressStatus) {
      throw new NotFoundException('In Progress status not found');
    }

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        statusId: inProgressStatus.id,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        status: true,
        priority: true,
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

    const employee = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
      },
    });

    console.log('START TASK DEBUG -> updatedTask:', {
      id: updatedTask.id,
      title: updatedTask.title,
      projectId: updatedTask.projectId,
      assigneeId: updatedTask.assigneeId,
      statusName: updatedTask.status?.name,
      projectName: updatedTask.project?.name,
    });

    console.log('START TASK DEBUG -> employee:', employee);

    if (
      employee &&
      updatedTask.project &&
      updatedTask.assigneeId === userId &&
      updatedTask.status.name === 'In Progress'
    ) {
      await this.notifyManagersTaskStarted({
        projectId: updatedTask.projectId,
        taskId: updatedTask.id,
        taskTitle: updatedTask.title,
        projectName: updatedTask.project.name,
        employeeId: employee.id,
        employeeFullName: employee.fullName,
      });
    }

    return updatedTask;
  }

  async archiveTask(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: task.projectId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied');
    }

    if (
      membership.roleInProject !== 'OWNER' &&
      membership.roleInProject !== 'MANAGER'
    ) {
      throw new ForbiddenException('Only managers can archive tasks');
    }

    if (task.isArchived) {
      throw new ForbiddenException('Task is already archived');
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archiveReason: TaskArchiveReason.HIDDEN,
        archivedById: userId,
      },
      include: {
        status: true,
        priority: true,
        complexity: true,
        assignee: true,
        archivedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async getMyArchivedTasks(userId: string) {
    const memberships = await this.prisma.projectMember.findMany({
      where: {
        userId,
      },
      select: {
        projectId: true,
      },
    });

    const projectIds = memberships.map((membership) => membership.projectId);

    const tasks = await this.prisma.task.findMany({
      where: {
        projectId: {
          in: projectIds,
        },
        isArchived: true,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        status: true,
        priority: true,
        complexity: true,
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        archivedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        reports: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            id: true,
            reportType: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        archivedAt: 'desc',
      },
    });

    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      archivedAt: task.archivedAt,
      archiveReason: task.archiveReason,
      requiresReport: task.requiresReport,
      reportType: task.reportType,
      latestReportStatus: task.reports[0]?.status ?? null,
      assignee: task.assignee,
      priority: task.priority,
      complexity: task.complexity,
      archivedBy: task.archivedBy,
      project: task.project,
    }));
  }

  async unarchiveTask(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: task.projectId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied');
    }

    if (
      membership.roleInProject !== 'OWNER' &&
      membership.roleInProject !== 'MANAGER'
    ) {
      throw new ForbiddenException(
        'Only manager or project owner can restore archived tasks',
      );
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        isArchived: false,
        archivedAt: null,
        archiveReason: null,
        archivedById: null,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        status: true,
        priority: true,
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
  }
}

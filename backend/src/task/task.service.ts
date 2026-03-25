import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskArchiveReason } from '@prisma/client';

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.task.create({
      data: {
        projectId: dto.projectId,
        statusId: dto.statusId,
        priorityId: dto.priorityId,
        complexityId: dto.complexityId,
        assigneeId: dto.assigneeId,
        title: dto.title,
        description: dto.description,
        dueDate: new Date(dto.dueDate),
        requiresReport: dto.requiresReport,
        reportType: dto.requiresReport ? dto.reportType : null,
      },
      include: {
        status: true,
        priority: true,
        complexity: true,
        assignee: true,
      },
    });
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
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true, status: true },
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

    if (task.isArchived) {
      throw new ForbiddenException('Archived task cannot be edited');
    }

    if (membership.roleInProject === 'MEMBER' && task.assigneeId !== userId) {
      throw new ForbiddenException(
        'Members can update only their assigned tasks',
      );
    }

    if (dto.assigneeId && membership.roleInProject === 'MEMBER') {
      throw new ForbiddenException('Members cannot reassign tasks');
    }

    if (dto.requiresReport === true && !dto.reportType && !task.reportType) {
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
        if (task.requiresReport || dto.requiresReport === true) {
          const approvedReport = await this.prisma.taskReport.findFirst({
            where: {
              taskId: task.id,
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

        completedAtValue = task.completedAt ?? new Date();
      } else {
        completedAtValue = null;
      }
    }

    const resolvedRequiresReport =
      dto.requiresReport !== undefined
        ? dto.requiresReport
        : task.requiresReport;

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        completedAt: completedAtValue,
        requiresReport: resolvedRequiresReport,
        reportType:
          resolvedRequiresReport === false
            ? null
            : dto.reportType !== undefined
              ? dto.reportType
              : undefined,
      },
      include: {
        status: true,
        priority: true,
        complexity: true,
        assignee: true,
      },
    });
  }

  async startTask(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        status: true,
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

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        statusId: inProgressStatus.id,
      },
      include: {
        status: true,
        priority: true,
        complexity: true,
        assignee: true,
      },
    });
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

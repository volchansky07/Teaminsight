import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

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
      throw new ForbiddenException('Report type is required when report is enabled');
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

    return this.prisma.task.findMany({
      where: { projectId },
      include: {
        status: true,
        priority: true,
        complexity: true,
        assignee: true,
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

    if (membership.roleInProject === 'MEMBER' && task.assigneeId !== userId) {
      throw new ForbiddenException(
        'Members can update only their assigned tasks',
      );
    }

    if (dto.assigneeId && membership.roleInProject === 'MEMBER') {
      throw new ForbiddenException('Members cannot reassign tasks');
    }

    if (dto.requiresReport === true && !dto.reportType && !task.reportType) {
      throw new ForbiddenException('Report type is required when report is enabled');
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
      dto.requiresReport !== undefined ? dto.requiresReport : task.requiresReport;

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

  async deleteTask(taskId: string, userId: string) {
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
      throw new ForbiddenException('Only managers can delete tasks');
    }

    return this.prisma.task.delete({
      where: { id: taskId },
    });
  }
}

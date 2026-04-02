import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskReportDto } from './dto/create-task-report.dto';
import { ApproveTaskReportDto } from './dto/approve-task-report.dto';
import { RejectTaskReportDto } from './dto/reject-task-report.dto';
import {
  NotificationEntityType,
  NotificationType,
  TaskReportStatus,
  TaskReportType,
} from '@prisma/client';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class TaskReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private async validateReportSubmission(
    userId: string,
    taskId: string,
    reportType: TaskReportType,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        status: true,
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

    if (task.assigneeId !== userId) {
      throw new ForbiddenException(
        'Only assigned employee can submit the report',
      );
    }

    if (!task.requiresReport) {
      throw new ForbiddenException('This task does not require a report');
    }

    if (task.reportType !== reportType) {
      throw new ForbiddenException(
        'Report type does not match task requirement',
      );
    }

    const latestReport = await this.prisma.taskReport.findFirst({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });

    if (latestReport && latestReport.status === TaskReportStatus.SUBMITTED) {
      throw new ForbiddenException(
        'Previous report is still waiting for manager review',
      );
    }

    return task;
  }

  private async notifyProjectManagersAboutSubmittedReport(params: {
    projectId: string;
    reportId: string;
    taskTitle: string;
    authorId: string;
    authorFullName: string;
  }) {
    const managers = await this.prisma.projectMember.findMany({
      where: {
        projectId: params.projectId,
        roleInProject: {
          in: ['OWNER', 'MANAGER'],
        },
        userId: {
          not: params.authorId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (!managers.length) return;

    await this.notificationService.createManyNotifications(
      managers.map((manager) => ({
        userId: manager.userId,
        title: 'Новый отчёт по задаче',
        message: `Сотрудник ${params.authorFullName} отправил отчёт по задаче «${params.taskTitle}».`,
        type: NotificationType.REPORT_SUBMITTED,
        entityType: NotificationEntityType.REPORT,
        entityId: params.reportId,
        projectId: params.projectId,
      })),
    );
  }

  private async notifyReportAuthor(params: {
    userId: string;
    projectId: string;
    reportId: string;
    taskTitle: string;
    type: 'REPORT_APPROVED' | 'REPORT_REJECTED';
    managerComment?: string | null;
  }) {
    const title =
      params.type === NotificationType.REPORT_APPROVED
        ? 'Отчёт принят'
        : 'Отчёт отклонён';

    const baseMessage =
      params.type === NotificationType.REPORT_APPROVED
        ? `Ваш отчёт по задаче «${params.taskTitle}» был принят руководителем.`
        : `Ваш отчёт по задаче «${params.taskTitle}» был отклонён руководителем.`;

    const commentPart =
      params.managerComment && params.managerComment.trim()
        ? ` Комментарий: ${params.managerComment.trim()}`
        : '';

    await this.notificationService.createNotification({
      userId: params.userId,
      title,
      message: `${baseMessage}${commentPart}`,
      type: params.type,
      entityType: NotificationEntityType.REPORT,
      entityId: params.reportId,
      projectId: params.projectId,
    });
  }

  async createReport(userId: string, dto: CreateTaskReportDto) {
    const task = await this.validateReportSubmission(
      userId,
      dto.taskId,
      dto.reportType,
    );

    const author = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!author) {
      throw new NotFoundException('User not found');
    }

    const createdReport = await this.prisma.taskReport.create({
      data: {
        taskId: dto.taskId,
        authorId: userId,
        reportType: dto.reportType,
        content: dto.content ?? null,
        status: TaskReportStatus.SUBMITTED,
      },
      include: {
        task: true,
        author: true,
      },
    });

    await this.notifyProjectManagersAboutSubmittedReport({
      projectId: task.projectId,
      reportId: createdReport.id,
      taskTitle: task.title,
      authorId: author.id,
      authorFullName: author.fullName,
    });

    return createdReport;
  }

  async getReportsByProject(projectId: string, userId: string) {
    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const hasAccess = project.ownerId === userId || !!membership;

    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.taskReport.findMany({
      where: {
        task: {
          projectId,
        },
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            isArchived: true,
            archivedAt: true,
            archiveReason: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createFileReport(
    userId: string,
    taskId: string,
    reportType: TaskReportType,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new ForbiddenException('File is required');
    }

    const task = await this.validateReportSubmission(userId, taskId, reportType);

    const author = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!author) {
      throw new NotFoundException('User not found');
    }

    const fileUrl = `/uploads/task-reports/${file.filename}`;

    const createdReport = await this.prisma.taskReport.create({
      data: {
        taskId,
        authorId: userId,
        reportType,
        fileUrl,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        status: TaskReportStatus.SUBMITTED,
      },
      include: {
        author: true,
        task: true,
      },
    });

    await this.notifyProjectManagersAboutSubmittedReport({
      projectId: task.projectId,
      reportId: createdReport.id,
      taskTitle: task.title,
      authorId: author.id,
      authorFullName: author.fullName,
    });

    return createdReport;
  }

  async getTaskReports(taskId: string, userId: string) {
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

    return this.prisma.taskReport.findMany({
      where: { taskId },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            projectId: true,
          },
        },
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async approveReport(
    reportId: string,
    managerId: string,
    dto: ApproveTaskReportDto,
  ) {
    const report = await this.prisma.taskReport.findUnique({
      where: { id: reportId },
      include: {
        task: true,
        author: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: report.task.projectId,
          userId: managerId,
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
      throw new ForbiddenException('Only manager can approve reports');
    }

    const doneStatus = await this.prisma.taskStatus.findFirst({
      where: { name: 'Done' },
    });

    if (!doneStatus) {
      throw new NotFoundException('Done status not found');
    }

    const updatedReport = await this.prisma.taskReport.update({
      where: { id: reportId },
      data: {
        status: TaskReportStatus.APPROVED,
        managerComment: dto.managerComment ?? 'Отчёт принят.',
        reviewedAt: new Date(),
        reviewedById: managerId,
      },
      include: {
        task: true,
        author: true,
      },
    });

    await this.prisma.task.update({
      where: { id: report.taskId },
      data: {
        statusId: doneStatus.id,
        completedAt: new Date(),
      },
    });

    await this.notifyReportAuthor({
      userId: report.authorId,
      projectId: report.task.projectId,
      reportId: report.id,
      taskTitle: report.task.title,
      type: 'REPORT_APPROVED',
      managerComment: dto.managerComment ?? 'Отчёт принят.',
    });

    return updatedReport;
  }

  async rejectReport(
    reportId: string,
    managerId: string,
    dto: RejectTaskReportDto,
  ) {
    const report = await this.prisma.taskReport.findUnique({
      where: { id: reportId },
      include: {
        task: true,
        author: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: report.task.projectId,
          userId: managerId,
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
      throw new ForbiddenException('Only manager can reject reports');
    }

    if (!dto.managerComment?.trim()) {
      throw new BadRequestException('Manager comment is required when rejecting report');
    }

    const updatedReport = await this.prisma.taskReport.update({
      where: { id: reportId },
      data: {
        status: TaskReportStatus.REJECTED,
        managerComment: dto.managerComment.trim(),
        reviewedAt: new Date(),
        reviewedById: managerId,
      },
      include: {
        task: true,
        author: true,
      },
    });

    await this.notifyReportAuthor({
      userId: report.authorId,
      projectId: report.task.projectId,
      reportId: report.id,
      taskTitle: report.task.title,
      type: NotificationType.REPORT_REJECTED,
      managerComment: dto.managerComment.trim(),
    });

    return updatedReport;
  }
}

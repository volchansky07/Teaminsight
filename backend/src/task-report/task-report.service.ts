import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskReportDto } from './dto/create-task-report.dto';
import { ApproveTaskReportDto } from './dto/approve-task-report.dto';
import { RejectTaskReportDto } from './dto/reject-task-report.dto';
import { TaskReportStatus, TaskReportType } from '@prisma/client';

@Injectable()
export class TaskReportService {
  constructor(private readonly prisma: PrismaService) {}

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

  async createReport(userId: string, dto: CreateTaskReportDto) {
    await this.validateReportSubmission(userId, dto.taskId, dto.reportType);

    return this.prisma.taskReport.create({
      data: {
        taskId: dto.taskId,
        authorId: userId,
        reportType: dto.reportType,
        content: dto.content,
        status: TaskReportStatus.SUBMITTED,
      },
      include: {
        author: true,
        task: true,
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

    await this.validateReportSubmission(userId, taskId, reportType);

    const fileUrl = `/uploads/task-reports/${file.filename}`;

    return this.prisma.taskReport.create({
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
    userId: string,
    dto: ApproveTaskReportDto,
  ) {
    const report = await this.prisma.taskReport.findUnique({
      where: { id: reportId },
      include: {
        task: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Task report not found');
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: report.task.projectId,
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
      throw new ForbiddenException('Only managers can approve reports');
    }

    const doneStatus = await this.prisma.taskStatus.findFirst({
      where: {
        name: 'Done',
      },
    });

    if (!doneStatus) {
      throw new NotFoundException('Done status not found');
    }

    const updatedReport = await this.prisma.taskReport.update({
      where: { id: reportId },
      data: {
        status: TaskReportStatus.APPROVED,
        managerComment: dto.managerComment,
        reviewedById: userId,
        reviewedAt: new Date(),
      },
      include: {
        author: true,
        reviewedBy: true,
        task: true,
      },
    });

    await this.prisma.task.update({
      where: { id: report.taskId },
      data: {
        statusId: doneStatus.id,
        completedAt: report.task.completedAt ?? new Date(),
      },
    });

    return updatedReport;
  }

  async rejectReport(
    reportId: string,
    userId: string,
    dto: RejectTaskReportDto,
  ) {
    const report = await this.prisma.taskReport.findUnique({
      where: { id: reportId },
      include: {
        task: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Task report not found');
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: report.task.projectId,
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
      throw new ForbiddenException('Only managers can reject reports');
    }

    return this.prisma.taskReport.update({
      where: { id: reportId },
      data: {
        status: TaskReportStatus.REJECTED,
        managerComment: dto.managerComment,
        reviewedById: userId,
        reviewedAt: new Date(),
      },
      include: {
        author: true,
        reviewedBy: true,
        task: true,
      },
    });
  }
}

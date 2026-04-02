import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { ProjectRole } from '@prisma/client';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async createProject(userId: string, dto: CreateProjectDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.organizationId) {
      throw new ForbiddenException('User does not belong to an organization');
    }

    if (!user.role || (user.role.name !== 'OWNER' && user.role.name !== 'MANAGER')) {
      throw new ForbiddenException(
        'Only organization owners and managers can create projects',
      );
    }

    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        organizationId: user.organizationId,
        ownerId: userId,
        members: {
          create: {
            userId,
            roleInProject: ProjectRole.OWNER,
          },
        },
      },
      include: {
        members: true,
      },
    });
  }

  async getMyProjects(userId: string) {
    return this.prisma.project.findMany({
      where: {
        isArchived: false,
        members: {
          some: { userId },
        },
      },
      include: {
        members: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getMyArchivedProjects(userId: string) {
    const memberships = await this.prisma.projectMember.findMany({
      where: {
        userId,
      },
      select: {
        projectId: true,
      },
    });

    const projectIds = memberships.map((membership) => membership.projectId);

    const projects = await this.prisma.project.findMany({
      where: {
        id: {
          in: projectIds,
        },
        isArchived: true,
      },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
        tasks: {
          select: {
            id: true,
            status: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        archivedAt: 'desc',
      },
    });

    return projects.map((project) => ({
      ...project,
      tasksCompletedCount: project.tasks.filter(
        (task) => task.status.name === 'Done',
      ).length,
    }));
  }

  async getById(projectId: string, currentUserId: string) {
    await this.assertProjectAccess(projectId, currentUserId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async getProjectMembers(projectId: string, currentUserId: string) {
    await this.assertProjectAccess(projectId, currentUserId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project.members.map((member) => ({
      userId: member.user.id,
      fullName: member.user.fullName,
      email: member.user.email,
      roleInProject: member.roleInProject,
    }));
  }

  async addMember(projectId: string, dto: AddMemberDto, currentUserId: string) {
    await this.assertProjectManageAccess(projectId, currentUserId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.organizationId !== project.organizationId) {
      throw new ForbiddenException('User belongs to another organization');
    }

    const existingMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: dto.userId,
        },
      },
    });

    if (existingMember) {
      throw new ForbiddenException('User is already a project member');
    }

    return this.prisma.projectMember.create({
      data: {
        projectId,
        userId: dto.userId,
        roleInProject: dto.roleInProject,
      },
      include: {
        user: true,
      },
    });
  }

  async removeMember(projectId: string, userId: string, currentUserId: string) {
    const currentMember = await this.assertProjectManageAccess(
      projectId,
      currentUserId,
    );

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Project member not found');
    }

    if (membership.roleInProject === ProjectRole.OWNER) {
      throw new ForbiddenException('Project owner cannot be removed');
    }

    if (userId === currentUserId && currentMember.roleInProject === ProjectRole.MANAGER) {
      throw new ForbiddenException('Manager cannot remove himself from the project');
    }

    return this.prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
  }

  async archiveProject(projectId: string, userId: string) {
    await this.assertProjectManageAccess(projectId, userId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.isArchived) {
      return project;
    }

    await this.prisma.task.updateMany({
      where: {
        projectId,
        isArchived: false,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archiveReason: 'PROJECT_ARCHIVED',
        archivedById: userId,
      },
    });

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archiveReason: 'MANUAL',
      },
    });
  }

  async unarchiveProject(projectId: string, userId: string) {
    await this.assertProjectManageAccess(projectId, userId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.isArchived) {
      return project;
    }

    await this.prisma.task.updateMany({
      where: {
        projectId,
        isArchived: true,
        archiveReason: 'PROJECT_ARCHIVED',
      },
      data: {
        isArchived: false,
        archivedAt: null,
        archiveReason: null,
        archivedById: null,
      },
    });

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        isArchived: false,
        archivedAt: null,
        archiveReason: null,
      },
    });
  }

  async getDashboard(projectId: string, currentUserId: string) {
    await this.assertProjectAccess(projectId, currentUserId);

    const totalTasks = await this.prisma.task.count({
      where: {
        projectId,
        isArchived: false,
      },
    });

    const completedTasks = await this.prisma.task.count({
      where: {
        projectId,
        isArchived: false,
        completedAt: { not: null },
      },
    });

    const completionRate =
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return {
      totalTasks,
      completedTasks,
      completionRate,
    };
  }

  async getContributions(projectId: string, currentUserId: string) {
    await this.assertProjectAccess(projectId, currentUserId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        tasks: {
          where: {
            isArchived: false,
          },
          include: {
            status: true,
            priority: true,
            complexity: true,
            assignee: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const now = new Date();

    const contributions = project.members.map((member) => {
      const memberTasks = project.tasks.filter(
        (task) => task.assigneeId === member.userId,
      );

      const completedTasksList = memberTasks.filter(
        (task) => task.status.name === 'Done',
      );

      const inProgressTasksList = memberTasks.filter(
        (task) => task.status.name === 'In Progress',
      );

      const todoTasksList = memberTasks.filter(
        (task) => task.status.name === 'Todo',
      );

      const onTimeCompletedTasks = completedTasksList.filter((task) => {
        if (!task.dueDate || !task.completedAt) return false;
        return task.completedAt.getTime() <= task.dueDate.getTime();
      });

      const overdueTasks = memberTasks.filter((task) => {
        if (!task.dueDate) return false;
        if (task.status.name === 'Done') return false;
        return task.dueDate.getTime() < now.getTime();
      });

      const completedComplexityPoints = completedTasksList.reduce(
        (sum, task) => sum + (task.complexity?.pointsValue ?? 0),
        0,
      );

      const completedPriorityScore = completedTasksList.reduce(
        (sum, task) => sum + (task.priority?.weight ?? 0),
        0,
      );

      const completedTasks = completedTasksList.length;
      const inProgressTasks = inProgressTasksList.length;
      const todoTasks = todoTasksList.length;
      const totalAssignedTasks = memberTasks.length;
      const onTimeCompletedCount = onTimeCompletedTasks.length;
      const overdueTasksCount = overdueTasks.length;

      const onTimeRate =
        completedTasks === 0
          ? 0
          : Math.round((onTimeCompletedCount / completedTasks) * 100);

      const contributionScore = Math.round(
        completedTasks * 10 +
          completedComplexityPoints * 3 +
          completedPriorityScore * 2 +
          onTimeRate * 0.2,
      );

      return {
        employeeId: member.user.id,
        fullName: member.user.fullName,
        roleInProject: member.roleInProject,
        completedTasks,
        inProgressTasks,
        todoTasks,
        totalAssignedTasks,
        completedComplexityPoints,
        completedPriorityScore,
        onTimeCompletedTasks: onTimeCompletedCount,
        overdueTasks: overdueTasksCount,
        onTimeRate,
        contributionScore,
      };
    });

    return contributions.sort(
      (a, b) => b.contributionScore - a.contributionScore,
    );
  }

  private async assertProjectAccess(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId === userId) {
      return { roleInProject: ProjectRole.OWNER };
    }

    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Access denied to this project');
    }

    return member;
  }

  private async assertProjectManageAccess(projectId: string, userId: string) {
    const member = await this.assertProjectAccess(projectId, userId);

    if (
      member.roleInProject !== ProjectRole.OWNER &&
      member.roleInProject !== ProjectRole.MANAGER
    ) {
      throw new ForbiddenException('Only project managers can manage members');
    }

    return member;
  }
}

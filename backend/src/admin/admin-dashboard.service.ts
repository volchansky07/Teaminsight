import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [
      organizationsTotal,
      activeOrganizations,
      usersTotal,
      activeUsers,
      inactiveUsers,
      superAdmins,
      activeProjects,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { isActive: true } }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: false } }),
      this.prisma.user.count({ where: { SystemRole: 'SUPER_ADMIN' } }),
      this.prisma.project.count({ where: { isArchived: false } }),
    ]);

    return {
      organizationsTotal,
      activeOrganizations,
      usersTotal,
      activeUsers,
      inactiveUsers,
      superAdmins,
      activeProjects,
    };
  }
}

import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminOrganizationsController } from './admin-organizations.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminOrganizationsService } from './admin-organizations.service';
import { AdminUsersService } from './admin-users.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { SuperAdminGuard } from './guards/super-admin.guard';

@Module({
  controllers: [
    AdminOrganizationsController,
    AdminUsersController,
    AdminDashboardController,
  ],
  providers: [
    PrismaService,
    AdminOrganizationsService,
    AdminUsersService,
    AdminDashboardService,
    SuperAdminGuard,
  ],
  exports: [
    AdminOrganizationsService,
    AdminUsersService,
    AdminDashboardService,
  ],
})
export class AdminModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationModule } from './organization/organization.module';
import { RoleModule } from './role/role.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';
import { TaskModule } from './task/task.module';
import { TaskReportModule } from './task-report/task-report.module';

@Module({
  imports: [
    PrismaModule,
    OrganizationModule,
    RoleModule,
    UserModule,
    AuthModule,
    ProjectModule,
    TaskModule,
    TaskReportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

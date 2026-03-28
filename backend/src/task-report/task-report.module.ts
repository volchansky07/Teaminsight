import { Module } from '@nestjs/common';
import { TaskReportService } from './task-report.service';
import { TaskReportController } from './task-report.controller';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [TaskReportController],
  providers: [TaskReportService, PrismaService],
  exports: [TaskReportService],
})
export class TaskReportModule {}

import { Module } from '@nestjs/common';
import { TaskReportController } from './task-report.controller';
import { TaskReportService } from './task-report.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [TaskReportController],
  providers: [TaskReportService, PrismaService],
  exports: [TaskReportService],
})
export class TaskReportModule {}

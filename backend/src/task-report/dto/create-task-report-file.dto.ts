import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { TaskReportType } from '@prisma/client';

export class CreateTaskReportFileDto {
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @IsEnum(TaskReportType)
  reportType: TaskReportType;
}

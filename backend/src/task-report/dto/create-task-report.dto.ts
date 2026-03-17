import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { TaskReportType } from '@prisma/client';

export class CreateTaskReportDto {
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @IsEnum(TaskReportType)
  reportType: TaskReportType;

  @IsString()
  @IsNotEmpty()
  content: string;
}

import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { TaskReportType } from '@prisma/client';

export class CreateTaskDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsUUID()
  @IsNotEmpty()
  statusId: string;

  @IsUUID()
  @IsNotEmpty()
  priorityId: string;

  @IsUUID()
  @IsNotEmpty()
  complexityId: string;

  @IsUUID()
  @IsNotEmpty()
  assigneeId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @IsBoolean()
  requiresReport: boolean;

  @ValidateIf((o) => o.requiresReport === true)
  @IsEnum(TaskReportType)
  reportType?: TaskReportType;
}

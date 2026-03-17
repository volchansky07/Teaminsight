import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { TaskReportType } from '@prisma/client';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  statusId?: string;

  @IsOptional()
  @IsUUID()
  priorityId?: string;

  @IsOptional()
  @IsUUID()
  complexityId?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  qualityScore?: number;

  @IsOptional()
  @IsBoolean()
  requiresReport?: boolean;

  @ValidateIf((o) => o.requiresReport === true || o.reportType !== undefined)
  @IsEnum(TaskReportType)
  @IsOptional()
  reportType?: TaskReportType;
}

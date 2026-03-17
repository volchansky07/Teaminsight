import { IsOptional, IsString } from 'class-validator';

export class ApproveTaskReportDto {
  @IsOptional()
  @IsString()
  managerComment?: string;
}

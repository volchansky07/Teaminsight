import { IsNotEmpty, IsString } from 'class-validator';

export class RejectTaskReportDto {
  @IsString()
  @IsNotEmpty()
  managerComment: string;
}

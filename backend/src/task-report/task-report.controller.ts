import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskReportService } from './task-report.service';
import { CreateTaskReportDto } from './dto/create-task-report.dto';
import { ApproveTaskReportDto } from './dto/approve-task-report.dto';
import { RejectTaskReportDto } from './dto/reject-task-report.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('task-reports')
@UseGuards(JwtAuthGuard)
export class TaskReportController {
  constructor(private readonly taskReportService: TaskReportService) {}

  @Post()
  createReport(@Req() req, @Body() dto: CreateTaskReportDto) {
    return this.taskReportService.createReport(req.user.sub, dto);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/task-reports',
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  uploadReport(
    @Req() req,
    @Body('taskId') taskId: string,
    @Body('reportType') reportType: 'FILE' | 'IMAGE',
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.taskReportService.createFileReport(
      req.user.sub,
      taskId,
      reportType,
      file,
    );
  }

  @Get('task/:taskId')
  getTaskReports(@Param('taskId') taskId: string, @Req() req) {
    return this.taskReportService.getTaskReports(taskId, req.user.sub);
  }

  @Patch(':id/approve')
  approveReport(
    @Param('id') reportId: string,
    @Req() req,
    @Body() dto: ApproveTaskReportDto,
  ) {
    return this.taskReportService.approveReport(reportId, req.user.sub, dto);
  }

  @Patch(':id/reject')
  rejectReport(
    @Param('id') reportId: string,
    @Req() req,
    @Body() dto: RejectTaskReportDto,
  ) {
    return this.taskReportService.rejectReport(reportId, req.user.sub, dto);
  }

  @Get('project/:projectId')
  getReportsByProject(@Param('projectId') projectId: string, @Req() req) {
    return this.taskReportService.getReportsByProject(projectId, req.user.sub);
  }
}

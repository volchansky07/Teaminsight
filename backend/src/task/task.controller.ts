import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateTaskDto) {
    return this.taskService.createTask(req.user.sub, dto);
  }

  @Get('project/:projectId')
  getProjectTasks(@Param('projectId') projectId: string, @Req() req) {
    return this.taskService.getProjectTasks(projectId, req.user.sub);
  }

  @Get('project/:projectId/archive')
  getArchivedProjectTasks(@Param('projectId') projectId: string, @Req() req) {
    return this.taskService.getArchivedProjectTasks(projectId, req.user.sub);
  }

  @Get('archive/my')
  getMyArchivedTasks(@Req() req) {
    return this.taskService.getMyArchivedTasks(req.user.sub);
  }

  @Get('statuses')
  getStatuses() {
    return this.taskService.getStatuses();
  }

  @Get('priorities')
  getPriorities() {
    return this.taskService.getPriorities();
  }

  @Get('complexities')
  getComplexities() {
    return this.taskService.getComplexities();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Req() req, @Body() dto: UpdateTaskDto) {
    return this.taskService.updateTask(id, req.user.sub, dto);
  }

  @Patch(':id/start')
  startTask(@Param('id') id: string, @Req() req) {
    return this.taskService.startTask(id, req.user.sub);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string, @Req() req) {
    return this.taskService.archiveTask(id, req.user.sub);
  }

  @Patch(':id/unarchive')
  unarchiveTask(@Param('id') id: string, @Req() req) {
    return this.taskService.unarchiveTask(id, req.user.sub);
  }
}

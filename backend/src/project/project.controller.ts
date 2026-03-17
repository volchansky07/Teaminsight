import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @Roles('admin')
  createProject(@Body() dto: CreateProjectDto, @Req() req) {
    return this.projectService.createProject(req.user.sub, dto);
  }

  @Get('my')
  getMyProjects(@Req() req) {
    return this.projectService.getMyProjects(req.user.sub);
  }

  @Get(':id/dashboard')
  getDashboard(@Param('id') id: string) {
    return this.projectService.getDashboard(id);
  }

  @Get(':id/contributions')
  getContributions(@Param('id') id: string) {
    return this.projectService.getContributions(id);
  }

  @Get(':id/members')
  getProjectMembers(@Param('id') id: string) {
    return this.projectService.getProjectMembers(id);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.projectService.addMember(id, dto);
  }

  @Delete(':id/members/:userId')
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.projectService.removeMember(id, userId);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.projectService.getById(id);
  }
}

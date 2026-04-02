import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
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

  @Post('test-create')
  testCreate() {
    return { ok: true, route: 'projects/test-create' };
  }

  @Post()
  createProject(@Body() dto: CreateProjectDto, @Req() req) {
    return this.projectService.createProject(req.user.sub, dto);
  }

  @Get('my')
  getMyProjects(@Req() req) {
    return this.projectService.getMyProjects(req.user.sub);
  }

  @Get('archive/my')
  getMyArchivedProjects(@Req() req) {
    return this.projectService.getMyArchivedProjects(req.user.sub);
  }

  @Get(':id/dashboard')
  getDashboard(@Param('id') id: string, @Req() req) {
    return this.projectService.getDashboard(id, req.user.sub);
  }

  @Get(':id/contributions')
  getContributions(@Param('id') id: string, @Req() req) {
    return this.projectService.getContributions(id, req.user.sub);
  }

  @Get(':id/members')
  getProjectMembers(@Param('id') id: string, @Req() req) {
    return this.projectService.getProjectMembers(id, req.user.sub);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() dto: AddMemberDto, @Req() req) {
    return this.projectService.addMember(id, dto, req.user.sub);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req,
  ) {
    return this.projectService.removeMember(id, userId, req.user.sub);
  }

  @Patch(':id/archive')
  archiveProject(@Param('id') id: string, @Req() req) {
    return this.projectService.archiveProject(id, req.user.sub);
  }

  @Patch(':id/unarchive')
  unarchiveProject(@Param('id') id: string, @Req() req) {
    return this.projectService.unarchiveProject(id, req.user.sub);
  }

  @Get(':id')
  getById(@Param('id') id: string, @Req() req) {
    return this.projectService.getById(id, req.user.sub);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { AdminOrganizationsService } from './admin-organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/organizations')
export class AdminOrganizationsController {
  constructor(
    private readonly adminOrganizationsService: AdminOrganizationsService,
  ) {}

  @Post()
  create(@Body() dto: CreateOrganizationDto) {
    return this.adminOrganizationsService.create(dto);
  }

  @Get()
  findAll() {
    return this.adminOrganizationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminOrganizationsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.adminOrganizationsService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.adminOrganizationsService.toggleActive(id);
  }
}

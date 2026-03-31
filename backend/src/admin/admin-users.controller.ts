import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Post()
  create(@Body() dto: CreateAdminUserDto) {
    return this.adminUsersService.create(dto);
  }

  @Get()
  findAll(
    @Query('organizationId') organizationId?: string,
    @Query('systemRole') systemRole?: 'USER' | 'SUPER_ADMIN',
    @Query('isActive') isActive?: 'true' | 'false',
    @Query('search') search?: string,
  ) {
    return this.adminUsersService.findAll({
      organizationId,
      systemRole,
      isActive,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminUsersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
    return this.adminUsersService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.adminUsersService.toggleActive(id);
  }

  @Patch(':id/reset-password')
  resetPassword(@Param('id') id: string) {
    return this.adminUsersService.resetPassword(id);
  }

  @Patch(':id/force-password-change')
  forcePasswordChange(@Param('id') id: string) {
    return this.adminUsersService.forcePasswordChange(id);
  }
}

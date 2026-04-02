import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { RoleService } from './role.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  create(
    @Body('name') name: string,
    @Body('description') description?: string,
  ) {
    return this.roleService.create(name, description);
  }

  @Get()
  findAll() {
    return this.roleService.findAll();
  }

  @Get(':name')
  findByName(@Param('name') name: string) {
    return this.roleService.findByName(name);
  }
}

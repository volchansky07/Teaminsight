import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAllForCurrentOrganization(@Req() req) {
    if (!req.user.organizationId) {
      throw new ForbiddenException('User does not belong to an organization');
    }

    return this.userService.findAllByOrganization(req.user.organizationId);
  }

  @Get('organization/:organizationId')
  @Roles('SUPER_ADMIN', 'OWNER', 'MANAGER')
  findAllByOrganization(
    @Param('organizationId') organizationId: string,
    @Req() req,
  ) {
    const actualRole = req.user.organizationRole ?? req.user.systemRole ?? req.user.role;

    if (actualRole !== 'SUPER_ADMIN' && req.user.organizationId !== organizationId) {
      throw new ForbiddenException('Access denied to another organization');
    }

    return this.userService.findAllByOrganization(organizationId);
  }

  @Get(':id')
  findById(@Param('id') id: string, @Req() req) {
    const actualRole = req.user.organizationRole ?? req.user.systemRole ?? req.user.role;

    if (actualRole === 'SUPER_ADMIN') {
      return this.userService.findById(id);
    }

    return this.userService.findByIdWithinOrganization(id, req.user.organizationId);
  }
}

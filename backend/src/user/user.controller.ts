import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAllForCurrentOrganization(@Req() req) {
    return this.userService.findAllByOrganization(req.user.organizationId);
  }

  @Get('organization/:organizationId')
  findAllByOrganization(@Param('organizationId') organizationId: string) {
    return this.userService.findAllByOrganization(organizationId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }
}

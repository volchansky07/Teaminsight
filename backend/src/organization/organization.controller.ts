import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { OrganizationService } from './organization.service';

@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  create(@Body('name') name: string) {
    return this.organizationService.create(name);
  }

  @Get()
  findAll() {
    return this.organizationService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.organizationService.findById(id);
  }
}

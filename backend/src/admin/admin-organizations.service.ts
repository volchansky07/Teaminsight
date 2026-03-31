import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class AdminOrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto) {
    return this.prisma.organization.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            fullName: true,
            email: true,
            isActive: true,
            SystemRole: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            isArchived: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.ensureExists(id);

    return this.prisma.organization.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description:
          typeof dto.description === 'string' ? dto.description.trim() : undefined,
        isActive: dto.isActive,
      },
    });
  }

  async toggleActive(id: string) {
    const organization = await this.ensureExists(id);

    return this.prisma.organization.update({
      where: { id },
      data: {
        isActive: !organization.isActive,
      },
    });
  }

  private async ensureExists(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }
}

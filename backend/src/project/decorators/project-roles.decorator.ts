import { SetMetadata } from '@nestjs/common';
import { ProjectRole } from '@prisma/client';

export const ProjectRoles = (...roles: ProjectRole[]) =>
  SetMetadata('project_roles', roles);

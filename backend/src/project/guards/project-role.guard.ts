import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectRole } from '@prisma/client';

@Injectable()
export class ProjectRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<ProjectRole[]>(
      'project_roles',
      context.getHandler(),
    );

    if (!requiredRoles) return true;

    const req = context.switchToHttp().getRequest();
    const membership = req.projectMembership;

    if (!requiredRoles.includes(membership.roleInProject)) {
      throw new ForbiddenException('Insufficient project role');
    }

    return true;
  }
}

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler())
    if (!requiredRoles) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      throw new ForbiddenException('User not authenticated')
    }

    // Check if user has ANY of the required roles
    // First check single role (backward compatibility), then check roles array (multi-role)
    const userRoles = user.roles ? (Array.isArray(user.roles) ? user.roles : [user.role]) : [user.role]
    const hasRole = requiredRoles.some((requiredRole) => userRoles.includes(requiredRole))

    if (!hasRole) {
      throw new ForbiddenException(
        `User roles "${userRoles.join(', ')}" are not allowed to access this resource`
      )
    }

    return true
  }
}

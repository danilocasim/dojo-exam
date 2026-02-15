import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../services/jwt.service';

/**
 * CurrentUser decorator
 * Extracts the decoded JWT payload from request.user
 * Used with @UseGuards(JwtAuthGuard)
 *
 * Example:
 *   @Get('profile')
 *   @UseGuards(JwtAuthGuard)
 *   getProfile(@CurrentUser() user: JwtPayload) {
 *     return { userId: user.userId, email: user.email };
 *   }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

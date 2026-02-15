import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '../services/jwt.service';

/**
 * JWT Authentication Guard
 * Validates Authorization header with Bearer token
 * Extracts and stores decoded payload in request for @CurrentUser decorator
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Extract token from Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    // Expected format: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const token = parts[1];

    try {
      // Verify and decode token
      const payload = this.jwtService.verifyAccessToken(token);

      // Store in request for dependency injection
      request.user = payload;

      return true;
    } catch (error) {
      this.logger.warn(
        `JWT verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      throw new UnauthorizedException(
        'Invalid or expired token: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  }
}

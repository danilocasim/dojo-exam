import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { JwtService, JwtPayload } from '../services/jwt.service';

/**
 * JWT Passport Strategy
 * Provides Passport.js integration for JWT authentication
 * Enables @UseGuards(AuthGuard('jwt')) alternative to custom JwtAuthGuard
 *
 * Example:
 *   @Get('protected')
 *   @UseGuards(AuthGuard('jwt'))
 *   getProtected(@CurrentUser() user: JwtPayload) {
 *     return { user };
 *   }
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private jwtService: JwtService) {
    super({
      // Extract token from Authorization header (Bearer scheme)
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Don't ignore expiration
      ignoreExpiration: false,
      // Secret key for verification
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'access-secret',
    });
  }

  /**
   * Validate JWT payload
   * Called after token is successfully decoded
   * @param payload - Decoded JWT payload
   * @returns Validated payload (will be assigned to request.user)
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.userId || !payload.email) {
      throw new UnauthorizedException('Invalid JWT payload');
    }

    return payload;
  }
}

import {
  Controller,
  Post,
  Get,
  Body,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { GoogleOAuthService } from '../services/google-oauth.service';
import { UserService } from '../services/user.service';
import { JwtService, type JwtPayload } from '../services/jwt.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

/**
 * Authentication controller
 * Handles Google OAuth and JWT token management
 */
@Controller('auth')
export class AuthController {
  constructor(
    private googleOAuthService: GoogleOAuthService,
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  /**
   * POST /auth/google/callback
   * Exchange Google token for JWT tokens.
   * Supports two flows:
   *   1. idToken (from native Google Sign-In SDK)
   *   2. accessToken (from expo-auth-session / web-based OAuth)
   * At least one of idToken or accessToken must be provided.
   */
  @Post('google/callback')
  async googleCallback(
    @Body() body: { idToken?: string; accessToken?: string },
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: any;
  }> {
    if (!body.idToken && !body.accessToken) {
      throw new UnauthorizedException(
        'Missing authentication token: provide idToken or accessToken',
      );
    }

    // Verify Google token — prefer idToken if available, fallback to accessToken
    let googlePayload;
    if (body.idToken) {
      googlePayload = await this.googleOAuthService.verifyIdToken(body.idToken);
    } else {
      googlePayload = await this.googleOAuthService.verifyAccessToken(
        body.accessToken!,
      );
    }

    // Find or create user
    const user = await this.userService.findOrCreateByGoogleId(googlePayload);

    // Update last login
    await this.userService.updateLastLogin(user.id);

    // Generate JWT tokens
    const { accessToken, refreshToken } = this.jwtService.generateTokens(
      user.id,
      user.email,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        googleId: user.googleId,
        email: user.email,
        name: user.name,
        picture: googlePayload.picture ?? null,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    };
  }

  /**
   * GET /auth/me
   * Get current authenticated user
   * Requires valid JWT access token in Authorization header
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ id: string; email: string }> {
    if (!user) {
      throw new UnauthorizedException('Not authenticated');
    }

    // Retrieve full user record
    const userRecord = await this.userService.getUserById(user.userId);

    if (!userRecord) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: userRecord.id,
      email: userRecord.email,
    };
  }

  /**
   * POST /auth/refresh
   * Refresh JWT access token using refresh token
   * Called when access token expires (401 response)
   */
  @Post('refresh')
  async refreshToken(@Body() body: { refreshToken: string }): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    if (!body.refreshToken) {
      throw new UnauthorizedException('Missing refreshToken');
    }

    try {
      // Verify refresh token
      const payload = this.jwtService.verifyRefreshToken(body.refreshToken);

      // Generate new tokens
      const tokens = this.jwtService.generateTokens(
        payload.userId,
        payload.email,
      );

      return tokens;
    } catch (error) {
      throw new UnauthorizedException(
        'Invalid or expired refresh token: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  }

  /**
   * POST /auth/logout
   * Logout current user (clear tokens on client-side)
   * Requires valid JWT access token in Authorization header
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: JwtPayload): Promise<{ message: string }> {
    if (!user) {
      throw new UnauthorizedException('Not authenticated');
    }

    // In a simple implementation, logout is client-side (clear AsyncStorage)
    // Could be extended with token blacklisting in future
    return { message: 'Logout successful' };
  }
}

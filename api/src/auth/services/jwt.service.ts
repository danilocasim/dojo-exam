import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Service for JWT token generation and verification
 * Handles short-lived access tokens and long-lived refresh tokens
 */
@Injectable()
export class JwtService {
  private accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'access-secret';
  private refreshTokenSecret =
    process.env.JWT_REFRESH_SECRET || 'refresh-secret';

  // Token expiry times (from Phase 2 clarifications)
  private readonly ACCESS_TOKEN_EXPIRY = '1h'; // 1 hour
  private readonly REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

  /**
   * Generate JWT access token
   * Used for API request authentication (1 hour expiry)
   * @param userId - User primary key UUID
   * @param email - User email address
   * @returns Signed JWT access token
   */
  generateAccessToken(userId: string, email: string): string {
    const payload: JwtPayload = {
      userId,
      email,
    };

    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      algorithm: 'HS256',
    });
  }

  /**
   * Generate JWT refresh token
   * Used for obtaining new access tokens (7 day expiry)
   * @param userId - User primary key UUID
   * @param email - User email address
   * @returns Signed JWT refresh token
   */
  generateRefreshToken(userId: string, email: string): string {
    const payload: JwtPayload = {
      userId,
      email,
    };

    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
      algorithm: 'HS256',
    });
  }

  /**
   * Generate both access and refresh tokens
   * Called after successful OAuth verification
   * @param userId - User primary key UUID
   * @param email - User email address
   * @returns Object with both tokens
   */
  generateTokens(
    userId: string,
    email: string,
  ): { accessToken: string; refreshToken: string } {
    return {
      accessToken: this.generateAccessToken(userId, email),
      refreshToken: this.generateRefreshToken(userId, email),
    };
  }

  /**
   * Verify JWT access token
   * Used by AuthGuard to validate request authorization
   * @param token - JWT access token
   * @returns Decoded payload
   * @throws Error if token is invalid or expired
   */
  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, this.accessTokenSecret) as JwtPayload;
  }

  /**
   * Verify JWT refresh token
   * Used in refresh endpoint to generate new access token
   * @param token - JWT refresh token
   * @returns Decoded payload
   * @throws Error if token is invalid or expired
   */
  verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, this.refreshTokenSecret) as JwtPayload;
  }

  /**
   * Decode token without verification (for debugging/logging)
   * Should not be used for authentication
   * @param token - JWT token
   * @returns Decoded payload or null if invalid
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }
}

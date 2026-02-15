import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '@prisma/client';
import { TokenPayload } from 'google-auth-library';

/**
 * Service for User account management
 * Handles user creation/retrieval by Google ID
 */
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find or create user by Google ID
   * Called after OAuth token verification to ensure user exists
   * @param payload - Google ID token payload
   * @returns User record (created or existing)
   */
  async findOrCreateByGoogleId(payload: TokenPayload): Promise<User> {
    const googleId = payload.sub; // Google's unique user identifier
    const email = payload.email!; // Non-null assertion after verification
    const name = payload.name;

    // Attempt to find existing user
    let user = await this.prisma.user.findUnique({
      where: { googleId },
    });

    // If not found, create new user
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          googleId,
          email,
          name: name || null,
        },
      });
    }

    return user;
  }

  /**
   * Retrieve user by ID
   * @param userId - User primary key UUID
   * @returns User record or null if not found
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * Update user's last login timestamp
   * Called after successful authentication
   * @param userId - User primary key UUID
   * @returns Updated User record
   */
  async updateLastLogin(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Store OAuth refresh token (encrypted at application level)
   * Called during token refresh flow
   * @param userId - User primary key UUID
   * @param oauthToken - Encrypted refresh token
   * @returns Updated User record
   */
  async updateOAuthToken(userId: string, oauthToken: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { oauthToken },
    });
  }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

/**
 * Google user info returned from the userinfo API endpoint
 */
export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

/**
 * Service for Google OAuth token verification
 * Supports two flows:
 * 1. ID Token verification (from native Google Sign-In SDK)
 * 2. Access Token verification (from expo-auth-session / web-based OAuth)
 */
@Injectable()
export class GoogleOAuthService {
  private client: OAuth2Client;

  constructor() {
    // Initialize Google OAuth client with Web Client ID from environment
    this.client = new OAuth2Client({
      clientId: process.env.GOOGLE_WEB_CLIENT_ID,
    });
  }

  /**
   * Verify Google ID token from mobile client
   * @param idToken - ID token from Google Sign-In SDK
   * @returns Decoded token payload with googleId, email, name, etc.
   * @throws BadRequestException if token is invalid or expired
   */
  async verifyIdToken(idToken: string): Promise<TokenPayload> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_WEB_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new BadRequestException('Invalid Google ID token: no payload');
      }

      if (!payload.sub || !payload.email) {
        throw new BadRequestException(
          'Invalid Google ID token: missing required fields (sub, email)',
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `Google ID token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Verify Google access token by calling Google's userinfo API
   * Used when the mobile client uses expo-auth-session (web-based OAuth flow)
   * which provides an access token instead of an ID token.
   *
   * @param accessToken - OAuth access token from Google
   * @returns User info as TokenPayload-compatible object
   * @throws BadRequestException if token is invalid
   */
  async verifyAccessToken(accessToken: string): Promise<TokenPayload> {
    try {
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!response.ok) {
        throw new BadRequestException(
          `Google access token verification failed: HTTP ${response.status}`,
        );
      }

      const userInfo: GoogleUserInfo = await response.json();

      if (!userInfo.sub || !userInfo.email) {
        throw new BadRequestException(
          'Invalid Google access token: missing required fields (sub, email)',
        );
      }

      // Convert to TokenPayload-compatible format
      return {
        sub: userInfo.sub,
        email: userInfo.email,
        email_verified: userInfo.email_verified ?? true,
        name: userInfo.name,
        picture: userInfo.picture,
        iss: 'accounts.google.com',
        aud: process.env.GOOGLE_WEB_CLIENT_ID || '',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      } as TokenPayload;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Google access token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

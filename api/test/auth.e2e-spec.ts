/**
 * T143: Auth E2E Tests
 *
 * Tests for auth endpoints:
 * - POST /auth/google/callback (exchange ID token for JWT)
 * - GET /auth/me (get current user)
 * - POST /auth/refresh (refresh access token)
 * - POST /auth/logout (logout)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { GoogleOAuthService } from '../src/auth/services/google-oauth.service';
import { UserService } from '../src/auth/services/user.service';
import { JwtService } from '../src/auth/services/jwt.service';

// Mock Google OAuth verification
const mockGooglePayload = {
  sub: 'google-user-123',
  email: 'test@example.com',
  name: 'Test User',
  email_verified: true,
  iss: 'accounts.google.com',
  aud: 'test-client-id',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};

const mockUser = {
  id: 'user-uuid-123',
  googleId: 'google-user-123',
  email: 'test@example.com',
  name: 'Test User',
  oauthToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: new Date(),
};

describe('Auth Controller (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let googleOAuthService: GoogleOAuthService;
  let userService: UserService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule, PrismaModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        user: {
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
      })
      .overrideProvider(GoogleOAuthService)
      .useValue({
        verifyIdToken: jest.fn(),
      })
      .overrideProvider(UserService)
      .useValue({
        findOrCreateByGoogleId: jest.fn(),
        updateLastLogin: jest.fn(),
        getUserById: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    googleOAuthService =
      moduleFixture.get<GoogleOAuthService>(GoogleOAuthService);
    userService = moduleFixture.get<UserService>(UserService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/google/callback', () => {
    it('should exchange valid Google ID token for JWT tokens', async () => {
      // Mock Google verification
      (googleOAuthService.verifyIdToken as jest.Mock).mockResolvedValue(
        mockGooglePayload,
      );
      (userService.findOrCreateByGoogleId as jest.Mock).mockResolvedValue(
        mockUser,
      );
      (userService.updateLastLogin as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .post('/auth/google/callback')
        .send({ idToken: 'valid-google-id-token' })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.id).toBe('user-uuid-123');

      // Verify Google token was validated
      expect(googleOAuthService.verifyIdToken).toHaveBeenCalledWith(
        'valid-google-id-token',
      );

      // Verify user was found/created
      expect(userService.findOrCreateByGoogleId).toHaveBeenCalledWith(
        mockGooglePayload,
      );

      // Verify last login was updated
      expect(userService.updateLastLogin).toHaveBeenCalledWith('user-uuid-123');
    });

    it('should return 401 when idToken is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/google/callback')
        .send({})
        .expect(401);
    });

    it('should return error when Google verification fails', async () => {
      (googleOAuthService.verifyIdToken as jest.Mock).mockRejectedValue(
        new Error('Invalid token'),
      );

      const response = await request(app.getHttpServer())
        .post('/auth/google/callback')
        .send({ idToken: 'invalid-token' })
        .expect(500);
    });

    it('should create new user on first sign-in', async () => {
      const newUser = { ...mockUser, id: 'new-user-uuid' };
      (googleOAuthService.verifyIdToken as jest.Mock).mockResolvedValue(
        mockGooglePayload,
      );
      (userService.findOrCreateByGoogleId as jest.Mock).mockResolvedValue(
        newUser,
      );
      (userService.updateLastLogin as jest.Mock).mockResolvedValue(newUser);

      const response = await request(app.getHttpServer())
        .post('/auth/google/callback')
        .send({ idToken: 'valid-token' })
        .expect(201);

      expect(response.body.user.id).toBe('new-user-uuid');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should exchange valid refresh token for new tokens', async () => {
      // Generate a valid refresh token
      const refreshToken = jwtService.generateRefreshToken(
        'user-uuid-123',
        'test@example.com',
      );

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(typeof response.body.accessToken).toBe('string');
      expect(typeof response.body.refreshToken).toBe('string');
    });

    it('should return 401 when refresh token is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(401);
    });

    it('should return 401 for invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token-string' })
        .expect(401);
    });

    it('should return 401 for expired refresh token', async () => {
      // Create a token that has already expired (by using a very short expiry)
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        process.env.JWT_REFRESH_SECRET || 'refresh-secret',
        { expiresIn: '0s' },
      );

      // Wait a moment to ensure token is expired
      await new Promise((r) => setTimeout(r, 100));

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: expiredToken })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user with valid access token', async () => {
      const accessToken = jwtService.generateAccessToken(
        'user-uuid-123',
        'test@example.com',
      );

      (userService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body.email).toBe('test@example.com');
    });

    it('should return 401 without Authorization header', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should return 401 with invalid access token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should return success message with valid token', async () => {
      const accessToken = jwtService.generateAccessToken(
        'user-uuid-123',
        'test@example.com',
      );

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(response.body.message).toBe('Logout successful');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });
  });
});

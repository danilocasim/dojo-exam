/**
 * T165: Integrity Controller
 *
 * REST API endpoint for Google Play Integrity token verification.
 * This is a stateless proxy to Google's Play Integrity API.
 *
 * Endpoint: POST /api/integrity/verify
 *
 * Flow:
 * 1. Mobile client obtains encrypted token from Google Play Integrity API
 * 2. Mobile client sends token to this endpoint
 * 3. Backend calls IntegrityService to decrypt token via Google API
 * 4. Backend returns verdict to mobile client
 * 5. Mobile client enforces block/allow decision (client-side enforcement)
 *
 * Important: This endpoint does NOT store verdicts or user data. Completely stateless.
 */
import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { IntegrityService } from './integrity.service';
import { VerifyTokenRequest } from './dto/verify-token.dto';
import { IntegrityVerifyResponse } from './dto/integrity-verdict.dto';

@Controller('api/integrity')
export class IntegrityController {
  private readonly logger = new Logger(IntegrityController.name);

  constructor(private readonly integrityService: IntegrityService) {}

  /**
   * POST /api/integrity/verify
   *
   * Verify Play Integrity token by decrypting it with Google's API.
   *
   * @param request - Contains encrypted token from Google Play Integrity API
   * @returns IntegrityVerifyResponse with success flag and verdict
   *
   * @throws HttpException 400 - Invalid token format or token expired
   * @throws HttpException 500 - Google API unavailable or timeout
   */
  @Post('verify')
  async verifyToken(
    @Body() request: VerifyTokenRequest,
  ): Promise<IntegrityVerifyResponse> {
    this.logger.debug(
      `Received verification request (token length: ${request.token?.length || 0})`,
    );

    try {
      // Validate request
      if (!request.token) {
        throw new BadRequestException('Token is required');
      }

      // Call service to verify token
      const verdict = await this.integrityService.verifyToken(request.token);

      // Return success response with verdict
      const response: IntegrityVerifyResponse = {
        success: true,
        verdict,
      };

      this.logger.log(
        `Verification successful: app=${verdict.appRecognitionVerdict}, license=${verdict.appLicensingVerdict}, device=${verdict.deviceRecognitionVerdict}`,
      );

      return response;
    } catch (error) {
      // Handle known exceptions from service
      if (error instanceof BadRequestException) {
        this.logger.warn(`Bad request: ${error.message}`);
        return {
          success: false,
          error: error.message,
        };
      }

      if (error instanceof InternalServerErrorException) {
        this.logger.error(`Internal error: ${error.message}`);
        return {
          success: false,
          error: error.message,
        };
      }

      // Handle HTTP exceptions
      if (error instanceof HttpException) {
        this.logger.error(
          `HTTP error (${error.getStatus()}): ${error.message}`,
        );
        return {
          success: false,
          error: error.message,
        };
      }

      // Handle unexpected errors
      this.logger.error(
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during token verification',
      };
    }
  }
}

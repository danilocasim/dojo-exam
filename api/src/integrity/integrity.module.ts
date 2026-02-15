/**
 * T162: Integrity Module
 * 
 * NestJS module for Google Play Integrity verification.
 * Provides stateless token verification service and REST API endpoint.
 * 
 * Exports:
 * - IntegrityService: For internal use by other modules (if needed)
 * 
 * Providers:
 * - IntegrityService: Stateless service for token decryption via Google API
 * 
 * Controllers:
 * - IntegrityController: POST /api/integrity/verify endpoint
 */
import { Module } from '@nestjs/common';
import { IntegrityController } from './integrity.controller';
import { IntegrityService } from './integrity.service';

@Module({
  controllers: [IntegrityController],
  providers: [IntegrityService],
  exports: [IntegrityService],
})
export class IntegrityModule {}

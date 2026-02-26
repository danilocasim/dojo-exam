import {
  Controller,
  Post,
  UseGuards,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as path from 'path';
import * as crypto from 'crypto';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

@Controller('admin/uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('s3.region') || 'us-east-1';
    this.bucket =
      this.configService.get<string>('s3.bucket') || 'dojo-exam-explanations';

    const accessKeyId = this.configService.get<string>('s3.accessKeyId');
    const secretAccessKey =
      this.configService.get<string>('s3.secretAccessKey');

    this.s3 = new S3Client({
      region: this.region,
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });

    this.logger.log(
      `S3 uploads configured: bucket=${this.bucket}, region=${this.region}`,
    );
  }

  /**
   * Upload an explanation image to S3
   * POST /admin/uploads/explanation-image
   * Multipart form with field name "file"
   */
  @Post('explanation-image')
  async uploadExplanationImage(
    @Req() req: FastifyRequest,
  ): Promise<{ url: string; filename: string }> {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(data.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${data.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Validate extension
    const ext = path.extname(data.filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `Invalid file extension: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }

    // Read the file buffer
    const buffer = await data.toBuffer();

    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB. Max: 2MB`,
      );
    }

    // Generate unique filename
    const hash = crypto
      .createHash('md5')
      .update(buffer)
      .digest('hex')
      .slice(0, 12);
    const timestamp = Date.now();
    const filename = `${timestamp}-${hash}${ext}`;
    const key = `explanations/${filename}`;

    // Upload to S3
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: data.mimetype,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch (err) {
      this.logger.error(`S3 upload failed: ${err}`);
      throw new BadRequestException('Image upload failed. Please try again.');
    }

    this.logger.log(
      `Explanation image uploaded to S3: ${key} (${(buffer.length / 1024).toFixed(1)}KB)`,
    );

    // Return the public S3 URL
    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    return { url, filename };
  }
}

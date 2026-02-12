import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: Pool;
  private readonly logger = new Logger('Prisma');

  constructor() {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/dojoexam';
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    const isDev = process.env.NODE_ENV !== 'production';

    super({
      adapter,
      log: isDev
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
          ]
        : [
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
          ],
    });

    this.pool = pool;

    if (isDev) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).$on('query', (e: any) => {
        this.logger.debug(`${e.query} — ${e.duration}ms`);
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).$on('warn', (e: any) => {
      this.logger.warn(e.message);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).$on('error', (e: any) => {
      this.logger.error(e.message);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}

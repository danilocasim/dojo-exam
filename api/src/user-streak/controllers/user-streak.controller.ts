import { Controller, Get, Put, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { UserStreakService } from '../services/user-streak.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';

export class UpsertStreakBody {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  currentStreak?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  longestStreak?: number;

  @IsOptional()
  @IsString()
  lastCompletionDate?: string | null;

  @IsOptional()
  @IsString()
  examDate?: string | null;
}

export class StreakResponse {
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string | null;
  examDate: string | null;
}

/**
 * REST endpoints for study streak persistence.
 * All routes require JWT authentication.
 *
 * GET  /user-streak/me   — fetch stored streak
 * PUT  /user-streak/me   — merge-upsert
 */
@Controller('user-streak')
@UseGuards(JwtAuthGuard)
@UseInterceptors(LoggingInterceptor)
export class UserStreakController {
  constructor(private userStreakService: UserStreakService) {}

  @Get('me')
  async getMyStreak(@CurrentUser('userId') userId: string): Promise<StreakResponse> {
    let streak = await this.userStreakService.getByUserId(userId);
    if (!streak) {
      // Lazily initialise streak row for this user so the table always has
      // a record once the user has accessed it.
      streak = await this.userStreakService.upsert(userId, {
        currentStreak: 0,
        longestStreak: 0,
        lastCompletionDate: null,
        examDate: null,
      });
    }
    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastCompletionDate: streak.lastCompletionDate,
      examDate: streak.examDate,
    };
  }

  @Put('me')
  async upsertMyStreak(
    @CurrentUser('userId') userId: string,
    @Body() body: UpsertStreakBody,
  ): Promise<StreakResponse> {
    const streak = await this.userStreakService.upsert(userId, {
      currentStreak: body.currentStreak ?? 0,
      longestStreak: body.longestStreak ?? 0,
      lastCompletionDate: body.lastCompletionDate ?? null,
      examDate: body.examDate ?? null,
    });
    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastCompletionDate: streak.lastCompletionDate,
      examDate: streak.examDate,
    };
  }
}

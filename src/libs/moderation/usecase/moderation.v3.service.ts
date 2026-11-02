import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../../../core/modules/rbac/role.enum.js';
import {
    ModerationQuery,
    ModerationSightingRow,
} from '../infrastructure/queries/moderation.query.js';
import { SIGHTING_LIST_DEFAULT_LIMIT } from '../moderation.constants.js';
import { ModerationRecentSightingDto } from './dtos/moderation-recent-sighting.dto.js';
import { ModerationSightingAuthorDto } from './dtos/moderation-sighting-author.dto.js';
import { ModerationSightingDto } from './dtos/moderation-sighting.dto.js';
import { ModerationUserSummaryDto } from './dtos/moderation-user-summary.dto.js';

@Injectable()
export class ModerationV3Service {
    constructor(private readonly moderationQuery: ModerationQuery) {}

    async findUserSummary(params: {
        userId: string;
    }): Promise<ModerationUserSummaryDto> {
        const row = await this.moderationQuery.findUserSummary(params);
        if (!row) {
            throw new NotFoundException('指定された利用者が見つかりません');
        }

        return {
            userId: row.userId,
            username: row.username,
            displayName: row.displayName,
            role: row.role,
            createdAt: row.createdAt.toISOString(),
            sightingCount: row.sightingCount,
            invalidatedCount: row.invalidatedCount,
            firstSightingAt: row.firstSightingAt?.toISOString() ?? null,
            lastSightingAt: row.lastSightingAt?.toISOString() ?? null,
            // user_role_changes（Task 6）が入ったら「viewer にした記録がある」も条件にする
            banned: row.role === Role.VIEWER,
        };
    }

    async findSightingsByUser(params: {
        userId: string;
        limit?: number;
        before?: string;
    }): Promise<ModerationSightingDto[]> {
        const rows = await this.moderationQuery.findSightingsByUser({
            userId: params.userId,
            limit: params.limit ?? SIGHTING_LIST_DEFAULT_LIMIT,
            before: params.before ? new Date(params.before) : null,
        });

        return rows.map(toSightingDto);
    }

    async findSightingAuthor(params: {
        operationSightingId: string;
    }): Promise<ModerationSightingAuthorDto> {
        const userId = await this.moderationQuery.findAuthorUserId(params);

        return { userId };
    }

    async findRecentSightings(params: {
        limit?: number;
        before?: string;
    }): Promise<ModerationRecentSightingDto[]> {
        const rows = await this.moderationQuery.findRecentSightings({
            limit: params.limit ?? SIGHTING_LIST_DEFAULT_LIMIT,
            before: params.before ? new Date(params.before) : null,
        });

        return rows.map((row) => ({
            ...toSightingDto(row),
            author: row.author,
        }));
    }
}

function toSightingDto(row: ModerationSightingRow): ModerationSightingDto {
    return {
        operationSightingId: row.operationSightingId,
        sightingTime: row.sightingTime.toISOString(),
        createdAt: row.createdAt.toISOString(),
        operationNumber: row.operationNumber,
        formationNumber: row.formationNumber,
        invalidated: row.invalidated,
        invalidatedBy: row.invalidatedByUserId
            ? {
                  userId: row.invalidatedByUserId,
                  username: row.invalidatedByUsername ?? '',
              }
            : null,
    };
}

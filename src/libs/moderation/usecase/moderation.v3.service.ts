import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../../../core/modules/rbac/role.enum.js';
import {
    ModerationQuery,
    ModerationSightingRow,
} from '../infrastructure/queries/moderation.query.js';
import { OperationSightingV3Service } from '../../operation-sighting/usecase/operation-sighting.v3.service.js';
import { SIGHTING_LIST_DEFAULT_LIMIT } from '../moderation.constants.js';
import { ModerationInvalidateSightingsResultDto } from './dtos/moderation-invalidate-sightings-result.dto.js';
import { ModerationRecentSightingDto } from './dtos/moderation-recent-sighting.dto.js';
import { ModerationSightingAuthorDto } from './dtos/moderation-sighting-author.dto.js';
import { ModerationSightingDto } from './dtos/moderation-sighting.dto.js';
import { ModerationUserSummaryDto } from './dtos/moderation-user-summary.dto.js';

@Injectable()
export class ModerationV3Service {
    constructor(
        private readonly moderationQuery: ModerationQuery,
        private readonly operationSightingV3Service: OperationSightingV3Service,
    ) {}

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
    /** 目撃をまとめて無効にする。ループ・合図・時間の予算は目撃情報の invalidateMany が持つ */
    async invalidateSightings(params: {
        ids: string[];
        userId: string;
        reason: string;
    }): Promise<ModerationInvalidateSightingsResultDto> {
        return this.operationSightingV3Service.invalidateMany(params);
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

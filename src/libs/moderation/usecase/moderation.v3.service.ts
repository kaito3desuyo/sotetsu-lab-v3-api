import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserRoleChangeCommand } from '../infrastructure/command/user-role-change.command.js';
import {
    ModerationTarget,
    RoleChange,
} from '../domain/moderation-target.domain.js';
import {
    ModerationQuery,
    ModerationSightingRow,
} from '../infrastructure/queries/moderation.query.js';
import { OperationSightingV3Service } from '../../operation-sighting/usecase/operation-sighting.v3.service.js';
import {
    SHARED_TRACE_ACCOUNT_COUNT,
    SIGHTING_LIST_DEFAULT_LIMIT,
} from '../moderation.constants.js';
import { ModerationInvalidateSightingsResultDto } from './dtos/moderation-invalidate-sightings-result.dto.js';
import { ModerationRecentSightingDto } from './dtos/moderation-recent-sighting.dto.js';
import { ModerationSightingAuthorDto } from './dtos/moderation-sighting-author.dto.js';
import { ModerationSightingDto } from './dtos/moderation-sighting.dto.js';
import { ModerationTraceDto } from './dtos/moderation-trace.dto.js';
import { ModerationUserSummaryDto } from './dtos/moderation-user-summary.dto.js';

@Injectable()
export class ModerationV3Service {
    constructor(
        private readonly moderationQuery: ModerationQuery,
        private readonly operationSightingV3Service: OperationSightingV3Service,
        private readonly userRoleChangeCommand: UserRoleChangeCommand,
        private readonly dataSource: DataSource,
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
            banned: row.banned,
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

    /** BAN（viewer への格下げ）。profiles.role の更新と記録を 1 トランザクションで行い、直した後の要約を返す */
    async banUser(params: {
        userId: string;
        changedBy: string;
        reason: string;
    }): Promise<ModerationUserSummaryDto> {
        await this.changeRole(params.userId, (target) =>
            target.ban({ userId: params.changedBy }, params.reason),
        );

        return this.findUserSummary({ userId: params.userId });
    }

    /** BAN の解除。直近の BAN の from_role（無ければ reporter）に戻し、直した後の要約を返す */
    async unbanUser(params: {
        userId: string;
        changedBy: string;
        reason?: string;
    }): Promise<ModerationUserSummaryDto> {
        await this.changeRole(params.userId, (target) =>
            target.unban({ userId: params.changedBy }, params.reason ?? null),
        );

        return this.findUserSummary({ userId: params.userId });
    }

    /** 同じ IP を使った他のアカウントを手がかりごとに（90 日以内） */
    async findTraces(params: {
        userId: string;
    }): Promise<ModerationTraceDto[]> {
        const rows = await this.moderationQuery.findTraces(params);

        return rows.map((row) => ({
            ip: row.ip,
            userAgents: row.userAgents,
            count: row.count,
            lastSeenAt: row.lastSeenAt.toISOString(),
            accountCount: row.accountCount,
            shared: row.accountCount >= SHARED_TRACE_ACCOUNT_COUNT,
            otherAccounts: row.otherAccounts,
        }));
    }

    /** 対象を行ロックで読み、ドメインの規則を通した記録を書く。規則違反は UseCaseError・対象が無ければ 404 */
    private async changeRole(
        userId: string,
        decide: (target: ModerationTarget) => RoleChange,
    ): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            const row = await this.moderationQuery.findModerationTarget(
                { userId },
                manager,
            );
            if (!row) {
                throw new NotFoundException('指定された利用者が見つかりません');
            }

            const change = decide(ModerationTarget.create(row));
            await this.userRoleChangeCommand.apply(change, manager);
        });
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

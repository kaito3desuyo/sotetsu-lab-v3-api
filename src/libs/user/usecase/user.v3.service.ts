import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BanTarget } from '../domain/ban-target.domain.js';
import { UserRoleChange } from '../domain/user-role-change.domain.js';
import { UserAccessTraceQuery } from '../infrastructure/queries/user-access-trace.query.js';
import { UserQuery } from '../infrastructure/queries/user.query.js';
import { SHARED_TRACE_ACCOUNT_COUNT } from '../user.constants.js';
import { UserAccessTraceDto } from './dtos/user-access-trace.dto.js';
import { UserSummaryDto } from './dtos/user-summary.dto.js';
import { UserRoleChangeService } from './user-role-change.service.js';

@Injectable()
export class UserV3Service {
    constructor(
        private readonly userQuery: UserQuery,
        private readonly userAccessTraceQuery: UserAccessTraceQuery,
        private readonly userRoleChangeService: UserRoleChangeService,
        private readonly dataSource: DataSource,
    ) {}

    async findUserSummary(params: { userId: string }): Promise<UserSummaryDto> {
        const row = await this.userQuery.findUserSummary(params);
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

    /** BAN（viewer への格下げ）。profiles.role の更新と記録を 1 トランザクションで行い、直した後の要約を返す */
    async banUser(params: {
        userId: string;
        changedBy: string;
        reason: string;
    }): Promise<UserSummaryDto> {
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
    }): Promise<UserSummaryDto> {
        await this.changeRole(params.userId, (target) =>
            target.unban({ userId: params.changedBy }, params.reason ?? null),
        );

        return this.findUserSummary({ userId: params.userId });
    }

    /** 同じ IP を使った他のアカウントを手がかりごとに（90 日以内） */
    async findTraces(params: {
        userId: string;
    }): Promise<UserAccessTraceDto[]> {
        const rows = await this.userAccessTraceQuery.findTraces(params);

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
        decide: (target: BanTarget) => UserRoleChange,
    ): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            const row = await this.userQuery.findBanTarget({ userId }, manager);
            if (!row) {
                throw new NotFoundException('指定された利用者が見つかりません');
            }

            const change = decide(BanTarget.create(row));
            await this.userRoleChangeService.apply(change, manager);
        });
    }
}

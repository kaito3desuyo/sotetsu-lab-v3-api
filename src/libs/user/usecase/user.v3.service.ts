import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserAccessTraceRetention } from '../domain/user-access-trace-retention.domain.js';
import { User } from '../domain/user.domain.js';
import { UserDomainBuilder } from '../infrastructure/builders/user.domain.builder.js';
import { UserCommand } from '../infrastructure/command/user.command.js';
import { UserAccessTraceQuery } from '../infrastructure/queries/user-access-trace.query.js';
import { UserQuery } from '../infrastructure/queries/user.query.js';
import { UserAccessTraceDto } from './dtos/user-access-trace.dto.js';
import { UserSummaryDto } from './dtos/user-summary.dto.js';
import { UserAccessTraceReadModel } from './read-models/user-access-trace.read-model.js';

@Injectable()
export class UserV3Service {
    constructor(
        private readonly userQuery: UserQuery,
        private readonly userAccessTraceQuery: UserAccessTraceQuery,
        private readonly userCommand: UserCommand,
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
        await this.changeRole(params.userId, (user) =>
            user.ban({ userId: params.changedBy }, params.reason),
        );

        return this.findUserSummary({ userId: params.userId });
    }

    /** BAN の解除。直近の BAN の from_role（無ければ reporter）に戻し、直した後の要約を返す */
    async unbanUser(params: {
        userId: string;
        changedBy: string;
        reason?: string;
    }): Promise<UserSummaryDto> {
        await this.changeRole(params.userId, (user) =>
            user.unban({ userId: params.changedBy }, params.reason ?? null),
        );

        return this.findUserSummary({ userId: params.userId });
    }

    /** 同じ IP を使った他のアカウントを手がかりごとに（残す期間の中だけ） */
    async findTraces(params: {
        userId: string;
    }): Promise<UserAccessTraceDto[]> {
        const rows = await this.userAccessTraceQuery.findTraces({
            userId: params.userId,
            since: UserAccessTraceRetention.cutoff(new Date()),
        });

        return rows.map((row) => UserAccessTraceReadModel.toDto(row));
    }

    /** 利用者を行ロックで読んで集約 User を組み、BAN・解除の振る舞いを通して保存する。規則違反は UseCaseError・対象が無ければ 404 */
    private async changeRole(
        userId: string,
        act: (user: User) => void,
    ): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            const row = await this.userQuery.findUserWithLastBan(
                { userId },
                manager,
            );
            if (!row) {
                throw new NotFoundException('指定された利用者が見つかりません');
            }

            const user = UserDomainBuilder.buildFromRow(row);
            act(user);
            await this.userCommand.save(user, manager);
        });
    }
}

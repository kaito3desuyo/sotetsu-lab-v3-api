import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Role } from '../../../../core/modules/rbac/role.enum.js';
import { OperationSightingAuthorModel } from '../../../operation-sighting/infrastructure/models/operation-sighting-author.model.js';
import { OperationSightingInvalidationModel } from '../../../operation-sighting/infrastructure/models/operation-sighting-invalidation.model.js';
import { OperationSightingModel } from '../../../operation-sighting/infrastructure/models/operation-sighting.model.js';
import { ProfileModel } from '../models/profile.model.js';
import { UserRoleChangeModel } from '../models/user-role-change.model.js';
import { bannedSql } from './user-banned.sql.js';

export type UserSummaryRow = {
    userId: string;
    username: string;
    displayName: string;
    role: string;
    createdAt: Date;
    sightingCount: number;
    invalidatedCount: number;
    firstSightingAt: Date | null;
    lastSightingAt: Date | null;
    /** 今 viewer で、かつ viewer にした記録（user_role_changes）がある */
    banned: boolean;
};

/** BAN・解除の対象。lastBanFromRole は直近の BAN（to_role = viewer）の from_role */
export type BanTargetRow = {
    userId: string;
    role: string;
    lastBanFromRole: string | null;
};

@Injectable()
export class UserQuery {
    constructor(
        @InjectRepository(ProfileModel)
        private readonly profileRepository: Repository<ProfileModel>,
    ) {}

    /** profiles が無ければ null。投稿数などは operation_sighting_authors（登録制の目撃）だけ数える */
    async findUserSummary(params: {
        userId: string;
    }): Promise<UserSummaryRow | null> {
        const qb = this.profileRepository.createQueryBuilder('p');
        const raw = await qb
            .leftJoin(OperationSightingAuthorModel, 'a', 'a.userId = p.userId')
            .leftJoin(
                OperationSightingModel,
                's',
                's.id = a.operationSightingId',
            )
            .leftJoin(
                OperationSightingInvalidationModel,
                'i',
                'i.operationSightingId = s.id',
            )
            .select('p.userId', 'userId')
            .addSelect('p.username', 'username')
            .addSelect('p.displayName', 'displayName')
            .addSelect('p.role', 'role')
            .addSelect('p.createdAt', 'createdAt')
            .addSelect('COUNT(DISTINCT s.id)', 'sightingCount')
            .addSelect(
                'COUNT(DISTINCT i.operationSightingId)',
                'invalidatedCount',
            )
            .addSelect('MIN(s.createdAt)', 'firstSightingAt')
            .addSelect('MAX(s.createdAt)', 'lastSightingAt')
            .addSelect(bannedSql(qb), 'banned')
            .setParameter('viewerRole', Role.VIEWER)
            .where('p.userId = :userId', { userId: params.userId })
            .groupBy('p.userId')
            .getRawOne();

        if (!raw) {
            return null;
        }

        return {
            userId: raw.userId,
            username: raw.username,
            displayName: raw.displayName,
            role: raw.role,
            createdAt: raw.createdAt,
            sightingCount: Number(raw.sightingCount),
            invalidatedCount: Number(raw.invalidatedCount),
            firstSightingAt: raw.firstSightingAt ?? null,
            lastSightingAt: raw.lastSightingAt ?? null,
            banned: raw.banned === true,
        };
    }

    /**
     * BAN・解除の対象を行ロックして引く（同じ人への同時の BAN で記録が二重にならないように）。
     * 呼び出し側のトランザクションの manager で、2 つのステートメントに分けて流す。
     * 1 本で読むと、ロック待ちが解けたとき profiles の行は最新になるが user_role_changes の副問い合わせは
     * 元のスナップショットのままで、同時に commit された BAN の記録が見えない（READ COMMITTED）。
     * profiles（FOR UPDATE）を先に読み、ロックを得た後の新しいステートメントで BAN の記録を引く。
     * profiles が無ければ null
     */
    async findBanTarget(
        params: { userId: string },
        manager: EntityManager,
    ): Promise<BanTargetRow | null> {
        const profile = await manager
            .createQueryBuilder(ProfileModel, 'p')
            .select('p.userId', 'userId')
            .addSelect('p.role', 'role')
            .where('p.userId = :userId', { userId: params.userId })
            .setLock('pessimistic_write')
            .getRawOne();

        if (!profile) {
            return null;
        }

        const lastBan = await manager
            .createQueryBuilder(UserRoleChangeModel, 'rc')
            .select('rc.fromRole', 'fromRole')
            .where('rc.userId = :userId', { userId: params.userId })
            .andWhere('rc.toRole = :viewerRole', { viewerRole: Role.VIEWER })
            .orderBy('rc.createdAt', 'DESC')
            .addOrderBy('rc.id', 'DESC')
            .limit(1)
            .getRawOne();

        return {
            userId: profile.userId,
            role: profile.role,
            lastBanFromRole: lastBan?.fromRole ?? null,
        };
    }
}

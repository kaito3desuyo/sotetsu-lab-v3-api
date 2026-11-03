import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { UserAccessTraceModel } from '../models/user-access-trace.model.js';

@Injectable()
export class UserAccessTraceCommand {
    constructor(
        @InjectRepository(UserAccessTraceModel)
        private readonly repository: Repository<UserAccessTraceModel>,
    ) {}

    /** セッションごと・IP ごとに 1 行。同じ (session_id, ip) が既にあれば何もしない */
    async insertSession(params: {
        userId: string;
        sessionId: string;
        ip: string;
        userAgent: string | null;
    }): Promise<void> {
        await this.repository
            .createQueryBuilder()
            .insert()
            .into(UserAccessTraceModel)
            .values({
                userId: params.userId,
                kind: 'session',
                sessionId: params.sessionId,
                ip: params.ip,
                userAgent: params.userAgent,
            })
            .orIgnore()
            .execute();
    }

    /** 呼び出し側のトランザクションの中で流す */
    async insertPost(
        params: {
            userId: string;
            operationSightingId: string;
            ip: string;
            userAgent: string | null;
        },
        manager: EntityManager,
    ): Promise<void> {
        await manager
            .createQueryBuilder()
            .insert()
            .into(UserAccessTraceModel)
            .values({
                userId: params.userId,
                kind: 'post',
                operationSightingId: params.operationSightingId,
                ip: params.ip,
                userAgent: params.userAgent,
            })
            .execute();
    }

    /** cutoff より古い行を消す */
    async deleteOlderThan(cutoff: Date): Promise<void> {
        await this.repository
            .createQueryBuilder()
            .delete()
            .from(UserAccessTraceModel)
            .where('created_at < :cutoff', { cutoff })
            .execute();
    }
}

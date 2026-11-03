import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { UserAccessTraceCommand } from '../infrastructure/command/user-access-trace.command.js';

/** 手がかりを残す日数 */
export const ACCESS_TRACE_RETENTION_DAYS = 90;
/** 古い行を消しに行く間隔 */
export const ACCESS_TRACE_PURGE_INTERVAL_MS = 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class UserAccessTraceService {
    readonly #logger = new Logger(UserAccessTraceService.name);
    /** Lambda の 1 実体の中で、すでに書いた `${sessionId}|${ip}` */
    readonly #recordedSessions = new Set<string>();
    #lastPurgedAt: Date | undefined;

    constructor(private readonly command: UserAccessTraceCommand) {}

    /** セッションごと・IP ごとに 1 行。同じ実体の中では 2 回目から DB に行かない */
    async recordSession(params: {
        userId: string;
        sessionId: string;
        ip: string;
        userAgent: string | null;
    }): Promise<void> {
        const key = `${params.sessionId}|${params.ip}`;
        if (this.#recordedSessions.has(key)) return;
        await this.command.insertSession(params);
        this.#recordedSessions.add(key);
        await this.purgeExpiredIfDue();
    }

    /** 投稿と同じトランザクションで書く。掃除は呼び出し側が commit の後に purgeExpiredIfDue を呼ぶ */
    async recordPost(
        params: {
            userId: string;
            operationSightingId: string;
            ip: string;
            userAgent: string | null;
        },
        manager: EntityManager,
    ): Promise<void> {
        await this.command.insertPost(params, manager);
    }

    /** 前回から 1 時間たっていれば 90 日より古い行を消す。失敗は warn で握る */
    async purgeExpiredIfDue(now: Date = new Date()): Promise<void> {
        if (
            this.#lastPurgedAt &&
            now.getTime() - this.#lastPurgedAt.getTime() <
                ACCESS_TRACE_PURGE_INTERVAL_MS
        ) {
            return;
        }
        this.#lastPurgedAt = now;
        try {
            await this.command.deleteOlderThan(
                new Date(now.getTime() - ACCESS_TRACE_RETENTION_DAYS * DAY_MS),
            );
        } catch (error) {
            this.#logger.warn(
                `手がかりの掃除に失敗した: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }
}

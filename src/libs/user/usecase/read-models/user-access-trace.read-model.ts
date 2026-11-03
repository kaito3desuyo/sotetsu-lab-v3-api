import { UserAccessTraceRow } from '../../infrastructure/queries/user-access-trace.query.js';
import { UserAccessTraceDto } from '../dtos/user-access-trace.dto.js';

/**
 * 手がかり（同じ IP を使ったアカウント）の読み取り側の組み立てと判定。
 * query は事実の行（アカウント数など）だけを返し、「共用か」の判断と DTO の形はここで決める。
 */
export class UserAccessTraceReadModel {
    /** この数以上のアカウントが同じ手がかり（IP）を使っていたら、携帯回線などの共用とみなして弱めて出す */
    static readonly SHARED_ACCOUNT_COUNT = 10;

    /** accountCount は対象を含む人数 */
    static isShared(accountCount: number): boolean {
        return accountCount >= UserAccessTraceReadModel.SHARED_ACCOUNT_COUNT;
    }

    static toDto(row: UserAccessTraceRow): UserAccessTraceDto {
        return {
            ip: row.ip,
            userAgents: row.userAgents,
            count: row.count,
            lastSeenAt: row.lastSeenAt.toISOString(),
            accountCount: row.accountCount,
            shared: UserAccessTraceReadModel.isShared(row.accountCount),
            otherAccounts: row.otherAccounts,
        };
    }
}

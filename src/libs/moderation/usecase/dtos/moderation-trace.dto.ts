export class ModerationTraceAccountDto {
    userId!: string;
    username!: string;
    role!: string;
    banned!: boolean;
}

/** 同じ手がかり（IPv4 は完全一致・IPv6 は /64）ごとの 1 件 */
export class ModerationTraceDto {
    /** IPv6 は /64 の網（例 2001:db8:1:2::/64） */
    ip!: string;
    userAgents!: string[];
    count!: number;
    lastSeenAt!: string;
    /** この手がかりを使ったアカウントの数（対象を含む） */
    accountCount!: number;
    /** accountCount が 10 以上（携帯回線などの共用）。弱めて出す */
    shared!: boolean;
    /** 対象を除く・最大 20 */
    otherAccounts!: ModerationTraceAccountDto[];
}

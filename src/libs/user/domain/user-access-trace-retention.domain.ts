const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 手がかり（user_access_traces）を残す期間（業務の決まり: 90 日）。
 * 掃除（消す）と読み取り（見せる）は、どちらもここが返す境目の時刻を使う。
 * 境目ちょうどの行は残す（消すのは境目より古い行・読むのは境目以降の行）
 */
export class UserAccessTraceRetention {
    static readonly DAYS = 90;

    /** now から数えて、これより古い手がかりは消す（読まない）境目の時刻 */
    static cutoff(now: Date): Date {
        return new Date(now.getTime() - UserAccessTraceRetention.DAYS * DAY_MS);
    }
}

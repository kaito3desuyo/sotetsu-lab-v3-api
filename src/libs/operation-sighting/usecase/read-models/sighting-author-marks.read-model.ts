import { Role } from '../../../../core/modules/rbac/role.enum.js';

/** 印の判定に使う事実（query が返す。判定はここ） */
export type SightingAuthorMarksFacts = {
    /** 投稿者の役割 */
    role: string;
    /** 投稿者の登録日時 */
    registeredAt: Date;
    /** その目撃の作成日時 */
    sightingCreatedAt: Date;
    /** その目撃までの BURST_WINDOW_MINUTES 分（その目撃を含む）の、同じ人の投稿数 */
    recentPostCount: number;
};

export type SightingAuthorMarksResult = {
    newAccount: boolean;
    burst: boolean;
};

/**
 * 新着の目撃に付ける投稿者の印（荒らしの見回りの手がかり）。規則はここ 1 か所に集める。
 * - newAccount: その目撃が、投稿者の登録から NEW_ACCOUNT_HOURS 時間未満（ちょうどは含めない）
 * - burst: その目撃までの BURST_WINDOW_MINUTES 分（その目撃を含む）に、同じ人の投稿が BURST_COUNT 件以上（ちょうどを含む）
 * - 印を付けるのは reporter・viewer の投稿者だけ。信頼済みの editor・manager は連投しても普通の作業なので常に false
 *   （EDITOR の朝の投稿には burst がほぼ全件付き、印の意味が無くなるため）
 */
export class SightingAuthorMarks {
    /** 登録してこの時間以内の利用者の目撃に印（newAccount）を付ける */
    static readonly NEW_ACCOUNT_HOURS = 24;
    /** 同じ人の投稿がその目撃までの BURST_WINDOW_MINUTES 分にこの件数以上あれば印（burst）を付ける */
    static readonly BURST_COUNT = 5;
    static readonly BURST_WINDOW_MINUTES = 60;
    /** 印を付ける投稿者の役割 */
    static readonly MARKED_ROLES: readonly string[] = [
        Role.REPORTER,
        Role.VIEWER,
    ];

    static of(facts: SightingAuthorMarksFacts): SightingAuthorMarksResult {
        if (!SightingAuthorMarks.MARKED_ROLES.includes(facts.role)) {
            return { newAccount: false, burst: false };
        }

        const newAccountUntil =
            facts.registeredAt.getTime() +
            SightingAuthorMarks.NEW_ACCOUNT_HOURS * 60 * 60 * 1000;

        return {
            newAccount: facts.sightingCreatedAt.getTime() < newAccountUntil,
            burst: facts.recentPostCount >= SightingAuthorMarks.BURST_COUNT,
        };
    }
}

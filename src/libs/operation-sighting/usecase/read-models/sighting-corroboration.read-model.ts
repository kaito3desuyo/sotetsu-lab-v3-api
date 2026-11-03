/** 裏付けの判定に使う事実（query が返す。判定はここ） */
export type SightingCorroborationFacts = {
    /** 本人の投稿の運用番号（運用 id でなく番号） */
    operationNumber: string;
    /** 本人の投稿が無効にされているか */
    invalidated: boolean;
    /**
     * 同じ運行日・同じ編成を見た、本人以外の有効な目撃の運用番号。
     * ゲスト（author 行なし）の目撃も含む。本人の別の投稿・他の人の無効な目撃は含まない
     */
    otherOperationNumbers: string[];
};

export type SightingCorroborationValue =
    | 'corroborated'
    | 'conflicting'
    | 'uncorroborated'
    | 'invalidated';

export type SightingCorroborationCounts = Record<
    SightingCorroborationValue,
    number
>;

/**
 * 本人の投稿 1 件に付ける「裏付け」の判定。規則はここ 1 か所に集める（SQL は運用番号の配列を返すだけ）。
 * 正解の表は無く、他の人の目撃と合うかどうかしか分からない。だから「当たり・外れ」とは呼ばない。
 * - invalidated: 本人の投稿が無効にされている。他の目撃は見ず、判定しない
 * - corroborated: 他の目撃の運用番号に、本人の運用番号と同じものが 1 件でもある
 * - conflicting: 他の目撃はあるが、本人の運用番号と同じものが 1 件も無い
 * - uncorroborated: 他の目撃が 1 件も無い（本人の別の投稿だけの場合も含む）
 * 時刻の前後は問わない（前の目撃も後の目撃も裏付けになる）。
 * 運用番号の付け替え（同日引き継ぎ・運用の変更）があると、正しい投稿でも conflicting になりうる。
 * conflicting は「間違い」を意味しない。
 */
export class SightingCorroboration {
    static of(facts: SightingCorroborationFacts): SightingCorroborationValue {
        if (facts.invalidated) {
            return 'invalidated';
        }

        if (facts.otherOperationNumbers.length === 0) {
            return 'uncorroborated';
        }

        return facts.otherOperationNumbers.includes(facts.operationNumber)
            ? 'corroborated'
            : 'conflicting';
    }

    /** 値ごとの件数。4 つのキーをいつも持つ（0 を含む） */
    static count(
        values: SightingCorroborationValue[],
    ): SightingCorroborationCounts {
        const counts: SightingCorroborationCounts = {
            corroborated: 0,
            conflicting: 0,
            uncorroborated: 0,
            invalidated: 0,
        };

        for (const value of values) {
            counts[value] += 1;
        }

        return counts;
    }
}

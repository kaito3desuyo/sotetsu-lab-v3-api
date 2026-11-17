import {
    compareSegmentsByTime,
    ItineraryLinkRule,
    ItinerarySegment,
} from '../../operation/domain/itinerary-link-rule.domain.js';

/** 乗り移りで始まる運用の、前の運用と到着の時刻 */
export interface TransferStartInfo {
    /** 前の区間の運用番号 */
    previousOperationNumber: string;
    /** 鉄道日の 0 時からの秒。前の区間の到着時刻 */
    arrivalSeconds: number;
}

/**
 * 「乗り移りで始まる運用」の判定。
 * 運用の最初の区間（compareSegmentsByTime でいちばん前）に、別の運用番号の前の区間がつながっているとき、
 * その運用は乗り移りで始まる。つながりは ItineraryLinkRule（決まり 1・2・3）で決める。
 * 前の運用の列車が着くまで、その車両はまだ前の運用を走っているので、それより前は投稿させない。
 */
export class TransferStart {
    private constructor() {}

    /**
     * segments はカレンダーの区間すべて（つながりはカレンダー全体で決まる）。
     * 乗り移りで始まらない（区間が無い・前が無い・前が同じ運用番号）なら null。
     */
    static find(
        segments: ItinerarySegment[],
        operationId: string,
    ): TransferStartInfo | null {
        const first = segments
            .filter((s) => s.operationId === operationId)
            .sort(compareSegmentsByTime)[0];
        if (!first) return null;
        const previous = ItineraryLinkRule.resolve(segments).previous.get(
            first.id,
        );
        if (!previous) return null;
        if (previous.segment.operationNumber === first.operationNumber) {
            return null;
        }
        return {
            previousOperationNumber: previous.segment.operationNumber,
            arrivalSeconds: previous.segment.endSeconds,
        };
    }
}

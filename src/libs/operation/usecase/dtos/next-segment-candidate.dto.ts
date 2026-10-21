import { Expose } from 'class-transformer';

export class NextSegmentCandidateDto {
    @Expose() tripOperationListId!: string;
    @Expose() tripId!: string;
    @Expose() operationId!: string;
    @Expose() operationNumber!: string;
    @Expose() startStationId!: string;
    @Expose() startSeconds!: number;
    /** すでに別の運用から来ている（決まり 2 の指し先、または決まり 1）か。選ぶと保存で拒まれる */
    @Expose() isTaken!: boolean;
    /** 列車の途中の運番替わり（決まり 1）で行き元が決まっているか。isTaken の内訳 */
    @Expose() isFixedByTripBlock!: boolean;
}

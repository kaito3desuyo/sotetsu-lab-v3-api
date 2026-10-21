import { Expose } from 'class-transformer';

export class ItineraryLinkEndDto {
    @Expose() tripOperationListId!: string;
    @Expose() tripId!: string;
    @Expose() operationId!: string;
    @Expose() operationNumber!: string;
    /** 切り替わる駅（前なら来た区間の終わる駅、次なら移る区間の始まる駅） */
    @Expose() stationId!: string;
    @Expose() rule!: 1 | 2 | 3;
}

/** 運番が変わるつながりだけを、区間ごとに返す（同じ運番どうしのつながりは返さない） */
export class OperationItineraryLinkDto {
    @Expose() tripOperationListId!: string;
    @Expose() tripId!: string;
    @Expose() operationId!: string;
    @Expose() previous!: ItineraryLinkEndDto | null;
    @Expose() next!: ItineraryLinkEndDto | null;
}

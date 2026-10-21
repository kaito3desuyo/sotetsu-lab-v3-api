export abstract class BaseTripOperationListDto<
    Id extends string | undefined = string,
> {
    id!: Id;
    tripId!: Id;
    operationId!: string;
    startStationId!: string;
    endStationId!: string;
    startTimeId!: Id;
    endTimeId!: Id;
}

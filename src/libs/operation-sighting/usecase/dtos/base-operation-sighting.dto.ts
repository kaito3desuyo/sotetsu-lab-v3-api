export abstract class BaseOperationSightingDto<
    Id extends string | undefined = string,
> {
    id!: Id;
    formationId!: string;
    operationId!: string;
    sightingTime!: Date;
}

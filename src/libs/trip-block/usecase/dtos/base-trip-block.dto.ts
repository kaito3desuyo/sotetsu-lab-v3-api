export abstract class BaseTripBlockDto<Id extends string | undefined = string> {
    id!: Id;
}

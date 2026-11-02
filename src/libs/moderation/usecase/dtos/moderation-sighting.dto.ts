export class ModerationSightingDto {
    operationSightingId!: string;
    sightingTime!: string;
    createdAt!: string;
    operationNumber!: string;
    formationNumber!: string;
    invalidated!: boolean;
    invalidatedBy!: { userId: string; username: string } | null;
}

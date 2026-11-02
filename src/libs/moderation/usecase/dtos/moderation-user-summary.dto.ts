export class ModerationUserSummaryDto {
    userId!: string;
    username!: string;
    displayName!: string;
    role!: string;
    createdAt!: string;
    sightingCount!: number;
    invalidatedCount!: number;
    firstSightingAt!: string | null;
    lastSightingAt!: string | null;
    banned!: boolean;
}

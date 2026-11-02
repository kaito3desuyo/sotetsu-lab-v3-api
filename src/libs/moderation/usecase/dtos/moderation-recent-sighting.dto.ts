import { ModerationSightingDto } from './moderation-sighting.dto.js';

export class ModerationRecentSightingDto extends ModerationSightingDto {
    /** ゲストの目撃は null */
    author!: {
        userId: string;
        username: string;
        displayName: string;
        role: string;
        newAccount: boolean;
        burst: boolean;
    } | null;
}

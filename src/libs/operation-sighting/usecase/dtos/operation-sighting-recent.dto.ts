import { OperationSightingSummaryDto } from './operation-sighting-summary.dto.js';

export class OperationSightingRecentDto extends OperationSightingSummaryDto {
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

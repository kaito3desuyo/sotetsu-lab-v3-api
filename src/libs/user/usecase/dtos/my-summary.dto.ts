import type { SightingCorroborationCounts } from '../../../operation-sighting/usecase/read-models/sighting-corroboration.read-model.js';

/** 本人のマイページの要約。username・role・banned は返さない（本人は認証で分かる・BAN 済みは入れない） */
export class MySummaryDto {
    sightingCount!: number;
    invalidatedCount!: number;
    firstSightingAt!: string | null;
    lastSightingAt!: string | null;
    corroboration!: SightingCorroborationCounts;
}

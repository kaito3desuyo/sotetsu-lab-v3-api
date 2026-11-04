import type { SightingCorroborationValue } from '../read-models/sighting-corroboration.read-model.js';
import { OperationSightingSummaryDto } from './operation-sighting-summary.dto.js';

/** 本人の目撃。一覧の 1 件に、他の人の目撃と合うかどうか（裏付け）を付ける */
export class MyOperationSightingDto extends OperationSightingSummaryDto {
    corroboration!: SightingCorroborationValue;
}

import { Injectable } from '@nestjs/common';
import { parseFieldsOnly } from '../../../core/utils/selection/parse-selection.js';
import { serializeSelection } from '../../../core/utils/selection/serialize-selection.js';
import { AgencyQuery } from '../infrastructure/queries/agency.query.js';
import { AGENCY_SELECTION_TREE } from './agency-selection.js';
import { AgencyDetailsDto } from './dtos/agency-details.dto.js';

@Injectable()
export class AgencyV3Service {
    constructor(private readonly agencyQuery: AgencyQuery) {}

    /** `fields` があれば選んだ列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findAll(
        params: { include?: unknown; fields?: unknown } = {},
    ): Promise<AgencyDetailsDto[] | Record<string, unknown>[]> {
        const selection = parseFieldsOnly(params, AGENCY_SELECTION_TREE);
        const result = await this.agencyQuery.findAll();
        if (!selection) return result;
        return result.map((o) =>
            serializeSelection(o, AGENCY_SELECTION_TREE, selection),
        );
    }
}

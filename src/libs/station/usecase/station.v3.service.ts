import { Injectable } from '@nestjs/common';
import { parseFieldsOnly } from '../../../core/utils/selection/parse-selection.js';
import { serializeSelection } from '../../../core/utils/selection/serialize-selection.js';
import { StationQuery } from '../infrastructure/queries/station.query.js';
import { StationDetailsDto } from './dtos/station-details.dto.js';
import { STATION_SELECTION_TREE } from './station-selection.js';

@Injectable()
export class StationV3Service {
    constructor(private readonly stationQuery: StationQuery) {}

    /** `fields` があれば選んだ列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findAll(
        params: { include?: unknown; fields?: unknown } = {},
    ): Promise<StationDetailsDto[] | Record<string, unknown>[]> {
        const selection = parseFieldsOnly(params, STATION_SELECTION_TREE);
        const result = await this.stationQuery.findAll();
        if (!selection) return result;
        return result.map((o) =>
            serializeSelection(o, STATION_SELECTION_TREE, selection),
        );
    }
}

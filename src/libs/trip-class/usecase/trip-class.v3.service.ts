import { Injectable } from '@nestjs/common';
import { parseFieldsOnly } from '../../../core/utils/selection/parse-selection.js';
import { serializeSelection } from '../../../core/utils/selection/serialize-selection.js';
import { TripClassQuery } from '../infrastructure/queries/trip-class.query.js';
import { TripClassDetailsDto } from './dtos/trip-class-details.dto.js';
import { TRIP_CLASS_SELECTION_TREE } from './trip-class-selection.js';

@Injectable()
export class TripClassV3Service {
    constructor(private readonly tripClassQuery: TripClassQuery) {}

    /** `fields` があれば選んだ列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findMany(
        params: {
            serviceId?: string;
            include?: unknown;
            fields?: unknown;
        } = {},
    ): Promise<TripClassDetailsDto[] | Record<string, unknown>[]> {
        const { serviceId, include, fields } = params;
        const selection = parseFieldsOnly(
            { include, fields },
            TRIP_CLASS_SELECTION_TREE,
        );
        const result = await this.tripClassQuery.findMany({ serviceId });
        if (!selection) return result;
        return result.map((o) =>
            serializeSelection(o, TRIP_CLASS_SELECTION_TREE, selection),
        );
    }
}

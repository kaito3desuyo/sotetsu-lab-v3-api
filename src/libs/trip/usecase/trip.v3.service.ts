import { Injectable } from '@nestjs/common';
import { parseSelection } from '../../../core/utils/selection/parse-selection.js';
import { TripQuery } from '../infrastructure/queries/trip.query.js';
import { TripDetailsDto } from './dtos/trip-details.dto.js';
import { TRIPS_BY_STATION_SELECTION_TREE } from './trips-by-station-selection.js';

@Injectable()
export class TripV3Service {
    constructor(private readonly tripQuery: TripQuery) {}

    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findManyByStationId(params: {
        stationId: string;
        calendarId: string;
        tripDirection: number;
        include?: unknown;
        fields?: unknown;
    }): Promise<TripDetailsDto[] | Record<string, unknown>[]> {
        const { stationId, calendarId, tripDirection, include, fields } =
            params;
        const selection = parseSelection(
            { include, fields },
            TRIPS_BY_STATION_SELECTION_TREE,
        );
        return selection
            ? this.tripQuery.findManyByStationIdWithSelection(
                  { stationId, calendarId, tripDirection },
                  selection,
              )
            : this.tripQuery.findManyByStationId({
                  stationId,
                  calendarId,
                  tripDirection,
              });
    }
}

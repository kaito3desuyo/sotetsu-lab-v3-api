import { pickFields, SparseFieldsets } from 'src/core/utils/sparse-fieldsets';
import { TripBlockSparseDto } from '../../usecase/dtos/trip-block-sparse.dto';
import { TripBlockModel } from '../models/trip-block.model';

const EMPTY: ReadonlySet<string> = new Set();

/**
 * `fields` を指定した `GET /v3/trip-blocks` の応答を組む（docs/adr/0002-v3-sparse-fieldsets.md）。
 * trip-block と trip の id は常に返し、ほかは指定した資源・項目だけ。null の項目は省く。
 */
export const TripBlockSparseDtoBuilder = {
    buildFromModel: (
        models: TripBlockModel[],
        fieldsets: SparseFieldsets,
    ): TripBlockSparseDto[] => {
        const tripFields = fieldsets.get('trip') ?? EMPTY;
        const timeFields = fieldsets.get('time');
        const tripOperationListFields = fieldsets.get('tripOperationList');
        const operationFields = fieldsets.get('operation');
        const tripClassFields = fieldsets.get('tripClass');

        return models.map((block) => ({
            id: block.id,
            trips: (block.trips ?? []).map((trip) => ({
                id: trip.id,
                ...pickFields(trip, tripFields),
                ...(timeFields && {
                    times: (trip.times ?? []).map((time) =>
                        pickFields(time, timeFields),
                    ),
                }),
                ...(tripOperationListFields && {
                    tripOperationLists: (trip.tripOperationLists ?? []).map(
                        (list) => ({
                            ...pickFields(list, tripOperationListFields),
                            ...(operationFields &&
                                list.operation && {
                                    operation: pickFields(
                                        list.operation,
                                        operationFields,
                                    ),
                                }),
                        }),
                    ),
                }),
                ...(tripClassFields &&
                    trip.tripClass && {
                        tripClass: pickFields(trip.tripClass, tripClassFields),
                    }),
            })),
        }));
    },
} as const;

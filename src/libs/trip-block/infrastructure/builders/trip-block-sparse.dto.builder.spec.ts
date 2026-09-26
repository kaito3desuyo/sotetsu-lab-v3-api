import { TripBlockModel } from '../models/trip-block.model';
import { TripBlockSparseDtoBuilder } from './trip-block-sparse.dto.builder';

const MODELS = [
    {
        id: 'b1',
        createdAt: new Date(),
        trips: [
            {
                id: 't1',
                tripNumber: '7416',
                tripDirection: 0,
                tripName: null,
                createdAt: new Date(),
                times: [
                    {
                        id: 'tm1',
                        stationId: 's1',
                        stopSequence: 1,
                        arrivalTime: null,
                        departureTime: '10:00:00',
                        pickupType: 0,
                    },
                    {
                        id: 'tm2',
                        stationId: 's2',
                        stopSequence: 2,
                        arrivalTime: null,
                        departureTime: null,
                        pickupType: 1,
                    },
                ],
                tripOperationLists: [
                    {
                        id: 'tol1',
                        operationId: 'op1',
                        operation: {
                            id: 'op1',
                            operationNumber: '94G',
                            calendarId: 'c1',
                        },
                    },
                ],
                tripClass: { id: 'tc1', tripClassName: '各停' },
            },
        ],
    },
] as unknown as TripBlockModel[];

describe('TripBlockSparseDtoBuilder', () => {
    it('trip-block と trip の id は常に返し、指定した資源・項目だけを返す（null は省く）', () => {
        const fieldsets = new Map([
            ['trip', new Set(['tripNumber', 'tripDirection', 'tripName'])],
            [
                'time',
                new Set([
                    'stationId',
                    'stopSequence',
                    'arrivalTime',
                    'departureTime',
                ]),
            ],
        ]);

        const result = TripBlockSparseDtoBuilder.buildFromModel(
            MODELS,
            fieldsets,
        );

        expect(result).toEqual([
            {
                id: 'b1',
                trips: [
                    {
                        id: 't1',
                        tripNumber: '7416',
                        tripDirection: 0,
                        times: [
                            {
                                stationId: 's1',
                                stopSequence: 1,
                                departureTime: '10:00:00',
                            },
                            { stationId: 's2', stopSequence: 2 },
                        ],
                    },
                ],
            },
        ]);
    });

    it('運用の一覧と運用・種別は指定したときだけ入れ子で返す', () => {
        const fieldsets = new Map([
            ['trip', new Set<string>()],
            ['tripOperationList', new Set(['operationId'])],
            ['operation', new Set(['operationNumber'])],
            ['tripClass', new Set(['tripClassName'])],
        ]);

        const [block] = TripBlockSparseDtoBuilder.buildFromModel(
            MODELS,
            fieldsets,
        );

        expect(block.trips[0]).toEqual({
            id: 't1',
            tripOperationLists: [
                { operationId: 'op1', operation: { operationNumber: '94G' } },
            ],
            tripClass: { tripClassName: '各停' },
        });
    });
});

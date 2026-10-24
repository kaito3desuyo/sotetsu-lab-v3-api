import { parseSelection } from '../../../core/utils/selection/parse-selection.js';
import { serializeSelection } from '../../../core/utils/selection/serialize-selection.js';
import { TripBlockModel } from '../infrastructure/models/trip-block.model.js';
import { TRIP_BLOCK_SELECTION_TREE } from './trip-block-selection.js';

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

// client の全線時刻表が今送っている fields（.context/ssr-plan/response-anatomy.mjs の ALL_LINE_FIELDS）
const ALL_LINE_FIELDS = {
    trip: 'tripNumber,tripDirection,tripBlockId,tripClassId,calendarId',
    time: 'stationId,stopSequence,arrivalDays,arrivalTime,departureDays,departureTime,pickupType,dropoffType',
    tripOperationList: 'operationId',
    operation: 'operationNumber',
    tripClass: 'tripClassName,tripClassColor',
};

const CASES: [string, Record<string, string>, unknown][] = [
    [
        'trip と time',
        {
            trip: 'tripNumber,tripDirection,tripName',
            time: 'stationId,stopSequence,arrivalTime,departureTime',
        },
        [
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
        ],
    ],
    [
        '運用の一覧・運用・種別',
        {
            trip: '',
            tripOperationList: 'operationId',
            operation: 'operationNumber',
            tripClass: 'tripClassName',
        },
        [
            {
                id: 'b1',
                trips: [
                    {
                        id: 't1',
                        tripOperationLists: [
                            {
                                operationId: 'op1',
                                operation: { operationNumber: '94G' },
                            },
                        ],
                        tripClass: { tripClassName: '各停' },
                    },
                ],
            },
        ],
    ],
    [
        '全線時刻表',
        ALL_LINE_FIELDS,
        [
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
                                pickupType: 0,
                            },
                            {
                                stationId: 's2',
                                stopSequence: 2,
                                pickupType: 1,
                            },
                        ],
                        tripOperationLists: [
                            {
                                operationId: 'op1',
                                operation: { operationNumber: '94G' },
                            },
                        ],
                        tripClass: { tripClassName: '各停' },
                    },
                ],
            },
        ],
    ],
];

describe('TRIP_BLOCK_SELECTION_TREE - fields だけの応答は ADR-0002 の頃と同じ', () => {
    it.each(CASES)('%s', (_, fields, expected) => {
        const selection = parseSelection({ fields }, TRIP_BLOCK_SELECTION_TREE);
        const result = MODELS.map((model) =>
            serializeSelection(model, TRIP_BLOCK_SELECTION_TREE, selection!),
        );
        expect(JSON.stringify(result)).toBe(JSON.stringify(expected));
    });
});

import { TripOperationList } from './trip-operation-list.domain.js';

const build = () =>
    TripOperationList.create({
        tripId: 'trip',
        operationId: 'op',
        startStationId: 's1',
        endStationId: 's2',
        startTimeId: 't1',
        endTimeId: 't2',
        nextTripOperationListId: 'next',
    });

describe('TripOperationList.update', () => {
    it('渡した項目だけを書き換え、ほかは残す', () => {
        const tol = build();
        tol.update({ operationId: 'op2', startTimeId: null });

        expect(tol.props).toEqual({
            tripId: 'trip',
            operationId: 'op2',
            startStationId: 's1',
            endStationId: 's2',
            startTimeId: null,
            endTimeId: 't2',
            nextTripOperationListId: 'next',
        });
    });

    it('undefined を明示して渡した項目は undefined にする', () => {
        const tol = build();
        tol.update({ nextTripOperationListId: undefined });

        expect('nextTripOperationListId' in tol.props).toBe(true);
        expect(tol.props.nextTripOperationListId).toBeUndefined();
    });
});

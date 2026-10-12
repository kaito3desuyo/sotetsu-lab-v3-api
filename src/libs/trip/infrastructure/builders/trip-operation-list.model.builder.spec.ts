import { UniqueEntityId } from 'src/core/classes/unique-entity-id';
import { TripOperationList } from '../../domain/trip-operation-list.domain';
import { TripOperationListModelBuilder } from './trip-operation-list.model.builder';

const base = {
    tripId: 't1',
    operationId: 'o1',
    startStationId: 's1',
    endStationId: 's2',
    startTimeId: 'tm1',
    endTimeId: 'tm2',
};

describe('TripOperationListModelBuilder', () => {
    it('次の区間を渡す', () => {
        const domain = TripOperationList.create(
            { ...base, nextTripOperationListId: 'next' },
            new UniqueEntityId('a'),
        );
        expect(TripOperationListModelBuilder.buildFromDomain(domain).nextTripOperationListId).toBe('next');
    });

    it('null は「つながりを消す」として渡す', () => {
        const domain = TripOperationList.create(
            { ...base, nextTripOperationListId: null },
            new UniqueEntityId('a'),
        );
        expect(TripOperationListModelBuilder.buildFromDomain(domain).nextTripOperationListId).toBeNull();
    });

    it('送られなかったときは列を書かない（undefined のまま。save が今の値を残す）', () => {
        const domain = TripOperationList.create(base, new UniqueEntityId('a'));
        const model = TripOperationListModelBuilder.buildFromDomain(domain);
        expect('nextTripOperationListId' in model).toBe(false);
    });
});

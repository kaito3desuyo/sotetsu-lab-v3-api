import { Trips } from '../../trip/domain/trip.domain.js';
import { TripBlock } from './trip-block.domain.js';

describe('TripBlock.update', () => {
    it('持っている項目は書き換え、持っていない項目は足さない', () => {
        const before = Trips.create([]);
        const after = Trips.create([]);
        const block = TripBlock.create({ trips: before });

        block.update({ trips: after, unknown: 'x' } as Parameters<
            TripBlock['update']
        >[0]);

        expect(block.props.trips).toBe(after);
        expect('unknown' in block.props).toBe(false);
    });
});

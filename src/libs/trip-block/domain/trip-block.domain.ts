import { AggregatedRoot } from '../../../core/classes/aggregated-root.js';
import { UniqueEntityId } from '../../../core/classes/unique-entity-id.js';
import { WatchedList } from '../../../core/classes/watched-list.js';
import { Trip, Trips } from '../../trip/domain/trip.domain.js';

interface ITripBlockProps {
    trips: Trips;
}

export class TripBlock extends AggregatedRoot<ITripBlockProps> {
    private constructor(props: ITripBlockProps, id?: UniqueEntityId) {
        super(props, id);
        this._copyTripBlockId();
    }

    static create(props: ITripBlockProps, id?: UniqueEntityId): TripBlock {
        return new TripBlock(props, id);
    }

    public update(props: Partial<ITripBlockProps>): void {
        const known = Object.entries(props).filter(
            ([key]) => key in this._props,
        );
        Object.assign(this._props, Object.fromEntries(known));
    }

    public getTripItems(): Trip[] {
        return this._props.trips.getItems();
    }

    public getTripByTripId(tripId: string): Trip | undefined {
        return this._props.trips.getItemByFn((trip) =>
            trip.id.isEqual(new UniqueEntityId(tripId)),
        );
    }

    public addTrip(trip: Trip): void {
        this._props.trips.add(trip);
    }

    public removeTrip(trip: Trip): void {
        this._props.trips.remove(trip);
    }

    public isTripEmpty(): boolean {
        return this._props.trips.isEmpty();
    }

    private _copyTripBlockId(): void {
        const trips = this._props.trips;

        trips.getItems().forEach((trip) => {
            trip.update({
                tripBlockId: this._id.value,
            });
        });
    }
}

export class TripBlocks extends WatchedList<TripBlock> {
    private constructor(initial?: TripBlock[]) {
        super(initial);
        this._validateWhenCreating();
    }

    public static create(tripBlocks?: TripBlock[]): TripBlocks {
        return new TripBlocks(tripBlocks);
    }

    public compareItems(a: TripBlock, b: TripBlock): boolean {
        return a.isEqual(b);
    }

    protected _validateWhenCreating(): void {}
    protected _validateWhenAdding(): void {}
    protected _validateWhenRemoving(): void {}
}

import { AggregatedRoot } from 'src/core/class/aggregated-root';
import { UniqueEntityId } from 'src/core/class/unique-entity-id';
import { WatchedList } from 'src/core/class/watched-list';
import { Trips } from 'src/libs/trip/domain/trip.domain';

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
        for (const key of Object.keys(props)) {
            this.props[key] = props[key];
        }
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

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected _validateWhenCreating(): void {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected _validateWhenAdding(): void {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected _validateWhenRemoving(): void {}
}
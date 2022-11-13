import { Entity } from 'src/core/class/entity';
import { UniqueEntityId } from 'src/core/class/unique-entity-id';
import { WatchedList } from 'src/core/class/watched-list';

interface ITripOperationListProps {
    tripId: string;
    operationId: string;
    startStationId: string;
    endStationId: string;
    startTimeId: string;
    endTimeId: string;
}

export class TripOperationList extends Entity<ITripOperationListProps> {
    private constructor(props: ITripOperationListProps, id?: UniqueEntityId) {
        super(props, id);
    }

    static create(
        props: ITripOperationListProps,
        id?: UniqueEntityId,
    ): TripOperationList {
        return new TripOperationList(props, id);
    }

    update(props: Partial<ITripOperationListProps>): void {
        for (const key of Object.keys(props)) {
            this._props[key] = props[key];
        }
    }
}

export class TripOperationLists extends WatchedList<TripOperationList> {
    private constructor(initial?: TripOperationList[]) {
        super(initial);
        this._validateWhenCreating();
    }

    public static create(
        tripOperationLists?: TripOperationList[],
    ): TripOperationLists {
        return new TripOperationLists(tripOperationLists);
    }

    public compareItems(a: TripOperationList, b: TripOperationList): boolean {
        return a.isEqual(b);
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected _validateWhenCreating(): void {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected _validateWhenAdding(): void {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected _validateWhenRemoving(): void {}
}

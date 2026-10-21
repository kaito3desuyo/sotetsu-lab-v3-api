import { Entity } from '../../../core/classes/entity.js';
import { UniqueEntityId } from '../../../core/classes/unique-entity-id.js';
import { WatchedList } from '../../../core/classes/watched-list.js';

interface ITripOperationListProps {
    tripId: string;
    operationId: string;
    startStationId: string;
    endStationId: string;
    startTimeId: string;
    endTimeId: string;
    /** undefined は「送られていない（今の値を残す）」、null は「つながりなし」 */
    nextTripOperationListId?: string | null;
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

    protected _validateWhenCreating(): void {}
    protected _validateWhenAdding(): void {}
    protected _validateWhenRemoving(): void {}
}

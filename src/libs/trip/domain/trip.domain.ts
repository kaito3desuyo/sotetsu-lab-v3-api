import { Entity } from '../../../core/classes/entity.js';
import { UniqueEntityId } from '../../../core/classes/unique-entity-id.js';
import { WatchedList } from '../../../core/classes/watched-list.js';
import { Times } from './time.domain.js';
import {
    TripOperationList,
    TripOperationLists,
} from './trip-operation-list.domain.js';

interface ITripProps {
    serviceId: string;
    tripNumber: string;
    tripClassId: string;
    tripName: string | null;
    tripDirection: number;
    tripBlockId: string;
    depotIn: boolean;
    depotOut: boolean;
    calendarId: string | null;
    extraCalendarId: string | null;
    times: Times;
    tripOperationLists: TripOperationLists;
}

export class Trip extends Entity<ITripProps> {
    private constructor(props: ITripProps, id?: UniqueEntityId) {
        super(props, id);
        this._copyTripId();
        this._copyTimeId();
    }

    static create(props: ITripProps, id?: UniqueEntityId): Trip {
        return new Trip(props, id);
    }

    public update(props: Partial<ITripProps>): void {
        for (const key of Object.keys(props)) {
            this._props[key] = props[key];
        }
    }

    public getFirstTripOperationList(): TripOperationList {
        return this._props.tripOperationLists.getItemByFn((_, i) => i === 0);
    }

    public addTripOperationList(tripOperationList: TripOperationList): void {
        this._props.tripOperationLists.add(tripOperationList);
    }

    public removeTripOperationList(tripOperationList: TripOperationList): void {
        this._props.tripOperationLists.remove(tripOperationList);
    }

    private _copyTripId(): void {
        const times = this._props.times;
        const tripOperationLists = this._props.tripOperationLists;

        times.getItems().forEach((time) => {
            time.update({
                tripId: this._id.value,
            });
        });

        tripOperationLists.getItems().forEach((tripOperationList) => {
            tripOperationList.update({
                tripId: this._id.value,
            });
        });
    }

    private _copyTimeId(): void {
        const times = this._props.times;
        const tripOperationLists = this._props.tripOperationLists;

        tripOperationLists.getItems().forEach((tripOperationList) => {
            tripOperationList.update({
                startTimeId:
                    times
                        .getItems()
                        .find(
                            (time) =>
                                time.props.stationId ===
                                tripOperationList.props.startStationId,
                        )?.id.value ?? null,
                endTimeId:
                    times
                        .getItems()
                        .find(
                            (time) =>
                                time.props.stationId ===
                                tripOperationList.props.endStationId,
                        )?.id.value ?? null,
            });
        });
    }
}

export class Trips extends WatchedList<Trip> {
    private constructor(initial?: Trip[]) {
        super(initial);
        this._validateWhenCreating();
    }

    public static create(trips?: Trip[]): Trips {
        return new Trips(trips);
    }

    public compareItems(a: Trip, b: Trip): boolean {
        return a.isEqual(b);
    }

    protected _validateWhenCreating(): void {}
    protected _validateWhenAdding(): void {}
    protected _validateWhenRemoving(): void {}
}

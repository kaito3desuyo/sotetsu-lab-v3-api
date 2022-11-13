import { Entity } from 'src/core/class/entity';
import { UniqueEntityId } from 'src/core/class/unique-entity-id';
import { WatchedList } from 'src/core/class/watched-list';
import { Times } from './time.domain';
import { TripOperationLists } from './trip-operation-list.domain';

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

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected _validateWhenCreating(): void {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected _validateWhenAdding(): void {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected _validateWhenRemoving(): void {}
}

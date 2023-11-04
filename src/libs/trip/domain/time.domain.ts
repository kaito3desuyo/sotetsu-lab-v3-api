import { Entity } from 'src/core/classes/entity';
import { UniqueEntityId } from 'src/core/classes/unique-entity-id';
import { WatchedList } from 'src/core/classes/watched-list';

interface ITimeProps {
    tripId: string;
    stationId: string;
    stopId: string | null;
    stopSequence: number;
    pickupType: number;
    dropoffType: number;
    arrivalDays: number | null;
    arrivalTime: string | null;
    departureDays: number | null;
    departureTime: string | null;
}

export class Time extends Entity<ITimeProps> {
    private constructor(props: ITimeProps, id?: UniqueEntityId) {
        super(props, id);
    }

    static create(props: ITimeProps, id?: UniqueEntityId): Time {
        return new Time(props, id);
    }

    update(props: Partial<ITimeProps>): void {
        for (const key of Object.keys(props)) {
            this._props[key] = props[key];
        }
    }
}

export class Times extends WatchedList<Time> {
    private constructor(initial?: Time[]) {
        super(initial);
        this._validateWhenCreating();
    }

    public static create(times?: Time[]): Times {
        return new Times(times);
    }

    public compareItems(a: Time, b: Time): boolean {
        return a.isEqual(b);
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected _validateWhenCreating(): void {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected _validateWhenAdding(): void {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected _validateWhenRemoving(): void {}
}

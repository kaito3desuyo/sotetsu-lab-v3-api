import { Entity } from '../../../core/classes/entity.js';
import { UniqueEntityId } from '../../../core/classes/unique-entity-id.js';
import { WatchedList } from '../../../core/classes/watched-list.js';

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
        Object.assign(this._props, props);
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

    protected _validateWhenCreating(): void {}
    protected _validateWhenAdding(): void {}
    protected _validateWhenRemoving(): void {}
}

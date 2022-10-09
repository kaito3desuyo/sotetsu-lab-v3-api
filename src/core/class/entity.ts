import { UniqueEntityId } from './unique-entity-id';

const isEntity = <T>(v: unknown): v is Entity<T> => {
    return v instanceof Entity;
};

export abstract class Entity<T> {
    protected readonly _id: UniqueEntityId;
    protected readonly _props: T;

    get id(): UniqueEntityId {
        return this._id;
    }

    get props(): T {
        return this._props;
    }

    constructor(props: T, id?: UniqueEntityId) {
        this._id = id ?? new UniqueEntityId();
        this._props = props;
    }

    public isEqual(object?: Entity<T>): boolean {
        if (object === null || object === undefined) {
            return false;
        }

        if (this === object) {
            return true;
        }

        if (!isEntity<T>(object)) {
            return false;
        }

        return this._id.isEqual(object._id);
    }
}

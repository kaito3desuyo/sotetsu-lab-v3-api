import { UniqueEntityId } from './unique-entity-id';
// tslint:disable: variable-name

const isEntity = (v: any): v is Entity<any> => {
    return v instanceof Entity;
};

export abstract class Entity<T> {
    protected readonly _id: UniqueEntityId;
    public readonly props: Readonly<T>;

    constructor(props: T, id?: UniqueEntityId) {
        this._id = id ? id : new UniqueEntityId();
        this.props = Object.freeze(props);
    }

    public isEqual(object?: Entity<T>): boolean {
        if (object === null || object === undefined) {
            return false;
        }

        if (this === object) {
            return true;
        }

        if (!isEntity(object)) {
            return false;
        }

        return this._id.isEqual(object._id);
    }
}

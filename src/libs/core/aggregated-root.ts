import { Entity } from './entity';
import { UniqueEntityId } from './unique-entity-id';

export abstract class AggregatedRoot<T> extends Entity<T> {
    get id(): UniqueEntityId {
        return this._id;
    }
}

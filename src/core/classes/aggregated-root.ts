import { Entity } from './entity.js';
import { UniqueEntityId } from './unique-entity-id.js';

export abstract class AggregatedRoot<T> extends Entity<T> {
    get id(): UniqueEntityId {
        return this._id;
    }
}

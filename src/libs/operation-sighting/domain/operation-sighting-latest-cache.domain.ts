import { Entity } from '../../../core/classes/entity.js';
import { UniqueEntityId } from '../../../core/classes/unique-entity-id.js';

type OperationSightingLatestCacheProps = {
    operationSightingId: string;
    operationNumber: string;
    formationNumber: string;
};

export class OperationSightingLatestCache extends Entity<OperationSightingLatestCacheProps> {
    private constructor(
        props: OperationSightingLatestCacheProps,
        id?: UniqueEntityId,
    ) {
        super(props, id);
    }

    static create(
        props: OperationSightingLatestCacheProps,
        id?: UniqueEntityId,
    ): OperationSightingLatestCache {
        return new OperationSightingLatestCache(props, id);
    }
}

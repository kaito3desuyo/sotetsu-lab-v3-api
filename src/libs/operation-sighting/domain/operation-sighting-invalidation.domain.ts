import { Entity } from '../../../core/classes/entity.js';
import { UniqueEntityId } from '../../../core/classes/unique-entity-id.js';

type OperationSightingInvalidationProps = {
    operationSightingId: string;
};

export class OperationSightingInvalidation extends Entity<OperationSightingInvalidationProps> {
    private constructor(
        props: OperationSightingInvalidationProps,
        id?: UniqueEntityId,
    ) {
        super(props, id);
    }

    static create(
        props: OperationSightingInvalidationProps,
        id?: UniqueEntityId,
    ): OperationSightingInvalidation {
        return new OperationSightingInvalidation(props, id);
    }
}

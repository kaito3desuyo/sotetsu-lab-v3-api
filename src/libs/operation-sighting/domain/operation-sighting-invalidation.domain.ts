import { Entity } from 'src/core/classes/entity';
import { UniqueEntityId } from 'src/core/classes/unique-entity-id';

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

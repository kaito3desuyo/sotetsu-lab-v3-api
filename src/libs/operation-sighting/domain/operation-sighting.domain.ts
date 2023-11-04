import { AggregatedRoot } from 'src/core/classes/aggregated-root';
import { UniqueEntityId } from 'src/core/classes/unique-entity-id';

type OperationSightingProps = {
    formationId: string;
    operationId: string;
    sightingTime: Date;
};

export class OperationSighting extends AggregatedRoot<OperationSightingProps> {
    private constructor(props: OperationSightingProps, id?: UniqueEntityId) {
        super(props, id);
    }

    static create(
        props: OperationSightingProps,
        id?: UniqueEntityId,
    ): OperationSighting {
        return new OperationSighting(props, id);
    }

    public update(props: Partial<OperationSightingProps>): void {
        for (const key of Object.keys(props)) {
            this.props[key] = props[key];
        }
    }
}

import { AggregatedRoot } from 'src/core/classes/aggregated-root';
import { UniqueEntityId } from 'src/core/classes/unique-entity-id';
import { OperationSightingInvalidation } from 'src/libs/operation-sighting/domain/operation-sighting-invalidation.domain';
import {
    OperationSightingManagementLog,
    OperationSightingManagementLogs,
} from './operation-sighting-management-log.domain';

type OperationSightingProps = {
    formationId: string;
    operationId: string;
    sightingTime: Date;
    invalidation: OperationSightingInvalidation | null;
    managementLogs: OperationSightingManagementLogs;
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

    invalidate(userId: string, reason: string): void {
        if (this.props.invalidation !== null) {
            throw new Error('Operation sighting is already invalidated.');
        }

        this.props.invalidation = OperationSightingInvalidation.create({
            operationSightingId: this.id.value,
        });
        this.props.managementLogs.add(
            OperationSightingManagementLog.create({
                operationSightingId: this.id.value,
                action: 'invalidation',
                userId,
                reason,
            }),
        );
    }

    restore(userId: string, reason: string): void {
        if (this.props.invalidation === null) {
            throw new Error('Operation sighting is not invalidated.');
        }

        this.props.invalidation = null;
        this.props.managementLogs.add(
            OperationSightingManagementLog.create({
                operationSightingId: this.id.value,
                action: 'restoration',
                userId,
                reason,
            }),
        );
    }

    isInvalid(): boolean {
        return !!this.props.invalidation;
    }
}

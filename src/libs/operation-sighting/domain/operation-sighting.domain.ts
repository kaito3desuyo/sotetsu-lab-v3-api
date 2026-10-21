import { AggregatedRoot } from '../../../core/classes/aggregated-root.js';
import { UniqueEntityId } from '../../../core/classes/unique-entity-id.js';
import { OperationSightingInvalidation } from './operation-sighting-invalidation.domain.js';
import {
    OperationSightingManagementLog,
    OperationSightingManagementLogs,
} from './operation-sighting-management-log.domain.js';

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
        Object.assign(this.props, props);
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

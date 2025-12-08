import { Entity } from 'src/core/classes/entity';
import { UniqueEntityId } from 'src/core/classes/unique-entity-id';
import { WatchedList } from 'src/core/classes/watched-list';

type OperationSightingManagementLogProps = {
    operationSightingId: string;
    userId: string;
    action: string;
    reason: string;
};

export class OperationSightingManagementLog extends Entity<OperationSightingManagementLogProps> {
    private constructor(
        props: OperationSightingManagementLogProps,
        id?: UniqueEntityId,
    ) {
        super(props, id);
    }

    static create(
        props: OperationSightingManagementLogProps,
        id?: UniqueEntityId,
    ): OperationSightingManagementLog {
        return new OperationSightingManagementLog(props, id);
    }
}

export class OperationSightingManagementLogs extends WatchedList<OperationSightingManagementLog> {
    private constructor(initial?: OperationSightingManagementLog[]) {
        super(initial);
        this._validateWhenCreating();
    }

    public static create(
        logs?: OperationSightingManagementLog[],
    ): OperationSightingManagementLogs {
        return new OperationSightingManagementLogs(logs);
    }

    public compareItems(
        a: OperationSightingManagementLog,
        b: OperationSightingManagementLog,
    ): boolean {
        return a.isEqual(b);
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected _validateWhenCreating(): void {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected _validateWhenAdding(): void {}

    protected _validateWhenRemoving(): void {
        throw new Error(
            'Removing items from OperationSightingManagementLogs is not allowed.',
        );
    }
}

import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { OperationSightingModel } from './operation-sighting.model';

@Entity({
    name: 'operation_sighting_management_logs',
})
export class OperationSightingManagementLogModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    operationSightingId: string;

    @Column('uuid')
    userId: string;

    @Column('text')
    action: string;

    @Column('text')
    reason: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt?: string;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt?: string;

    @ManyToOne(
        () => OperationSightingModel,
        (operationSighting) => operationSighting.managementLogs,
        {
            orphanedRowAction: 'delete',
        },
    )
    @JoinColumn({ name: 'operation_sighting_id' })
    readonly operationSighting?: OperationSightingModel;
}

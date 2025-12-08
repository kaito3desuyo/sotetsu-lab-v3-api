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
    name: 'operation_sighting_invalidations',
})
export class OperationSightingInvalidationModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    operationSightingId: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt?: string;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt?: string;

    @ManyToOne(
        () => OperationSightingModel,
        (operationSighting) => operationSighting.invalidations,
        {
            orphanedRowAction: 'delete',
        },
    )
    @JoinColumn({ name: 'operation_sighting_id' })
    readonly operationSighting?: OperationSightingModel;
}

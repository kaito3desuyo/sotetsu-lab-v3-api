import { FormationModel } from 'src/libs/formation/infrastructure/models/formation.model';
import { OperationModel } from 'src/libs/operation/infrastructure/models/operation.model';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { OperationSightingInvalidationModel } from './operation-sighting-invalidation.model';
import { OperationSightingManagementLogModel } from './operation-sighting-management-log.model';

@Entity({
    name: 'operation_sightings',
})
@Index(['formationId', 'sightingTime'])
@Index(['operationId', 'sightingTime'])
@Index(['sightingTime', 'updatedAt', 'id'])
export class OperationSightingModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    formationId: string;

    @Column('uuid')
    operationId: string;

    @Column({ type: 'timestamptz', precision: 3 })
    @Index()
    sightingTime: Date;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt?: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt?: Date;

    @ManyToOne(
        () => OperationModel,
        (operation) => operation.operationSightings,
    )
    @JoinColumn({ name: 'operation_id' })
    readonly operation?: OperationModel;

    @ManyToOne(
        () => FormationModel,
        (formation) => formation.operationSightings,
    )
    @JoinColumn({ name: 'formation_id' })
    readonly formation?: FormationModel;

    @OneToMany(
        () => OperationSightingInvalidationModel,
        (operationSightingInvalidation) =>
            operationSightingInvalidation.operationSighting,
        { cascade: true },
    )
    readonly invalidations?: OperationSightingInvalidationModel[];

    @OneToMany(
        () => OperationSightingManagementLogModel,
        (operationSightingManagementLog) =>
            operationSightingManagementLog.operationSighting,
        { cascade: true },
    )
    readonly managementLogs?: OperationSightingManagementLogModel[];
}

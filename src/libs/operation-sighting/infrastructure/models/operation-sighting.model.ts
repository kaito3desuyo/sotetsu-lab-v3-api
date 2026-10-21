import { FormationModel } from '../../../formation/infrastructure/models/formation.model.js';
import { OperationModel } from '../../../operation/infrastructure/models/operation.model.js';
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
    type Relation,
} from 'typeorm';
import { OperationSightingInvalidationModel } from './operation-sighting-invalidation.model.js';
import { OperationSightingManagementLogModel } from './operation-sighting-management-log.model.js';

@Entity({
    name: 'operation_sightings',
})
@Index(['formationId'])
@Index(['operationId'])
@Index(['formationId', 'sightingTime'])
@Index(['operationId', 'sightingTime'])
@Index(['sightingTime', 'updatedAt', 'id'])
export class OperationSightingModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    formationId!: string;

    @Column('uuid')
    operationId!: string;

    @Column({ type: 'timestamptz', precision: 3 })
    @Index()
    sightingTime!: Date;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt?: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt?: Date;

    @ManyToOne(
        () => OperationModel,
        (operation) => operation.operationSightings,
    )
    @JoinColumn({ name: 'operation_id' })
    readonly operation?: Relation<OperationModel>;

    @ManyToOne(
        () => FormationModel,
        (formation) => formation.operationSightings,
    )
    @JoinColumn({ name: 'formation_id' })
    readonly formation?: Relation<FormationModel>;

    @OneToMany(
        () => OperationSightingInvalidationModel,
        (operationSightingInvalidation) =>
            operationSightingInvalidation.operationSighting,
        { cascade: true },
    )
    readonly invalidations?: Relation<OperationSightingInvalidationModel[]>;

    @OneToMany(
        () => OperationSightingManagementLogModel,
        (operationSightingManagementLog) =>
            operationSightingManagementLog.operationSighting,
        { cascade: true },
    )
    readonly managementLogs?: Relation<OperationSightingManagementLogModel[]>;
}

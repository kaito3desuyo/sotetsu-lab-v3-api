import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { FormationModel } from 'src/libs/formation/infrastructure/models/formation.model';
import { OperationModel } from 'src/libs/operation/infrastructure/models/operation.model';

@Entity({
    name: 'operation_sightings',
})
@Index(['formationId', 'sightingTime'])
@Index(['operationId', 'sightingTime'])
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
}

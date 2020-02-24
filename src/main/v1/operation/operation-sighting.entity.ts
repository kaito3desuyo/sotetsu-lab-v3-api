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
import { Operation } from './operation.entity';
import { Formation } from '../formation/formation.entity';

/* tslint:disable: variable-name */
@Entity({
    name: 'operation_sightings',
})
@Index(['formation_id', 'sighting_time'])
@Index(['operation_id', 'sighting_time'])
export class OperationSighting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    formation_id: string;

    @Column('uuid')
    operation_id: string;

    circulated_operation_id?: string;

    @Column({ type: 'timestamptz', precision: 3 })
    @Index()
    sighting_time: Date;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updated_at: Date;

    @ManyToOne(type => Operation, operation => operation.operation_sightings)
    @JoinColumn({ name: 'operation_id' })
    readonly operation?: Operation;

    readonly circulated_operation?: Operation;

    @ManyToOne(type => Formation, formation => formation.operation_sightings)
    @JoinColumn({ name: 'formation_id' })
    readonly formation?: Formation;
}

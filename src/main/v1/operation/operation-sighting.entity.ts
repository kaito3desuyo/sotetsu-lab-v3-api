import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Operation } from './operation.entity';
import { Formation } from '../formation/formation.entity';

/* tslint:disable: variable-name */
@Entity({
  name: 'operation_sightings',
})
export class OperationSighting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  formation_id: string;

  @Column('uuid')
  operation_id: string;

  @Column('timestamptz')
  sighting_time: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(type => Operation, operation => operation.operation_sightings)
  @JoinColumn({ name: 'operation_id' })
  readonly operation?: Operation;

  @ManyToOne(type => Formation, formation => formation.operation_sightings)
  @JoinColumn({ name: 'formation_id' })
  readonly formation?: Formation;
}

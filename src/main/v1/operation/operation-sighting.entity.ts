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

  @Column()
  formation_id: string;

  @Column()
  operation_id: string;

  @Column()
  sighting_time: Date;

  @CreateDateColumn({
    type: 'timestamptz',
    default: 'LOCALTIMESTAMP',
  })
  created_at: Date;

  @Column({
    type: 'timestamptz',
    default: 'LOCALTIMESTAMP',
    onUpdate: 'LOCALTIMESTAMP',
  })
  updated_at: Date;

  @ManyToOne(type => Operation, operation => operation.operation_sightings)
  @JoinColumn({ name: 'operation_id' })
  operation?: Operation;

  @ManyToOne(type => Formation, formation => formation.operation_sightings)
  @JoinColumn({ name: 'formation_id' })
  formation?: Formation;
}

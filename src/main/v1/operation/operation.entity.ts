import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Calender } from '../calender/calender.entity';
import { OperationSighting } from './operation-sighting.entity';
import { Trip } from '../trip/trip.entity';
/* tslint:disable: variable-name */

@Entity({
  name: 'operations',
})
export class Operation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  calender_id: string;

  @Column('varchar')
  operation_number: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(type => Calender, calender => calender.operations)
  @JoinColumn({ name: 'calender_id' })
  readonly calender?: Calender;

  @OneToMany(type => Trip, trip => trip.operation)
  readonly trips?: Trip[];

  @OneToMany(
    type => OperationSighting,
    operationSighting => operationSighting.operation,
  )
  readonly operation_sightings?: OperationSighting[];
}

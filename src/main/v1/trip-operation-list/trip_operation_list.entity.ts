// tslint:disable: variable-name

import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Trip } from '../trip/trip.entity';
import { Operation } from '../operation/operation.entity';
import { Time } from '../time/time.entity';

@Entity({
  name: 'trip_operation_lists',
})
export class TripOperationList {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  trip_id: string;

  @Column('uuid')
  operation_id: string;

  @Column('uuid')
  start_time_id: string;

  @Column('uuid')
  end_time_id: string;

  @CreateDateColumn({ type: 'timestamptz', precision: 3 })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
  updated_at: Date;

  @ManyToOne(type => Trip, trip => trip)
  @JoinColumn({ name: 'trip_id' })
  trip?: Trip;

  @ManyToOne(type => Operation, operation => operation)
  @JoinColumn({ name: 'operation_id' })
  operation?: Operation;

  @ManyToOne(type => Time, time => time)
  @JoinColumn({ name: 'start_time_id' })
  start_time?: Time;

  @ManyToOne(type => Time, time => time)
  @JoinColumn({ name: 'end_time_id' })
  end_time?: Time;
}
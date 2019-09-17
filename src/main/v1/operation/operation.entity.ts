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
import { TripOperationList } from '../trip-operation-list/trip_station_list.entity';
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

  @OneToMany(
    type => TripOperationList,
    tripOperationList => tripOperationList.operation,
  )
  readonly trip_operation_lists?: TripOperationList[];

  @OneToMany(
    type => OperationSighting,
    operationSighting => operationSighting.operation,
  )
  readonly operation_sightings?: OperationSighting[];
}

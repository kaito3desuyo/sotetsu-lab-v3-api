import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Trip } from '../trip/trip.entity';
import { Station } from '../station/station.entity';
import { Stop } from '../stop/stop.entity';
import { TripOperationList } from '../trip-operation-list/trip_operation_list.entity';
// tslint:disable: variable-name
@Entity({
  name: 'times',
})
export class Time {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  trip_id: string;

  @Column('uuid')
  station_id: string;

  @Column('uuid', { nullable: true })
  stop_id: string;

  @Column('int')
  stop_sequence: number;

  @Column('smallint')
  pickup_type: number;

  @Column('smallint')
  dropoff_type: number;

  @Column('smallint', { nullable: true })
  arrival_days: number;

  @Column('time', { nullable: true })
  arrival_time: string;

  @Column('smallint', { nullable: true })
  departure_days: number;

  @Column('time', { nullable: true })
  departure_time: string;
  /*
    @Column('bool')
    depot_in: boolean;

    @Column('bool')
    depot_out: boolean;
    */

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(
    type => TripOperationList,
    tripOperationList => tripOperationList.start_time,
  )
  readonly start_trip_operation_lists?: TripOperationList[];

  @OneToMany(
    type => TripOperationList,
    tripOperationList => tripOperationList.end_time,
  )
  readonly end_trip_operation_lists?: TripOperationList[];

  @ManyToOne(type => Station, station => station)
  @JoinColumn({ name: 'station_id' })
  readonly station?: Station;

  @ManyToOne(type => Stop, stop => stop)
  @JoinColumn({ name: 'stop_id' })
  readonly stop?: Stop;

  @ManyToOne(type => Trip, trip => trip.times, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  readonly trip?: Trip;
}

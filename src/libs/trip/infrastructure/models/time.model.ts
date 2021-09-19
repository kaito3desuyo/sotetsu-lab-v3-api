import { Station } from 'src/main/v1/station/station.entity';
import { Stop } from 'src/main/v1/stop/stop.entity';
import { Trip } from 'src/main/v1/trip/trip.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    JoinColumn,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    Index,
} from 'typeorm';
import { TripOperationListModel } from './trip-operation-list.model';
import { TripModel } from './trip.model';

@Entity({
    name: 'times',
})
export class TimeModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    tripId: string;

    @Column('uuid')
    stationId: string;

    @Column('uuid', { nullable: true })
    stopId: string;

    @Column('int')
    @Index()
    stopSequence: number;

    @Column('smallint')
    @Index()
    pickupType: number;

    @Column('smallint')
    @Index()
    dropoffType: number;

    @Column('smallint', { nullable: true })
    @Index()
    arrivalDays: number;

    @Column('time', { nullable: true })
    @Index()
    arrivalTime: string;

    @Column('smallint', { nullable: true })
    @Index()
    departureDays: number;

    @Column('time', { nullable: true })
    @Index()
    departureTime: string;
    /*
      @Column('bool')
      depot_in: boolean;
  
      @Column('bool')
      depot_out: boolean;
      */

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt: Date;

    @ManyToOne(() => TripModel, (trip) => trip.times, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'trip_id' })
    readonly trip?: TripModel;

    @ManyToOne(() => Station, (station) => station.times)
    @JoinColumn({ name: 'station_id' })
    readonly station?: Station;

    @ManyToOne(() => Stop, (stop) => stop.times)
    @JoinColumn({ name: 'stop_id' })
    readonly stop?: Stop;

    @OneToMany(
        () => TripOperationListModel,
        (tripOperationList) => tripOperationList.startTime,
    )
    readonly startTripOperationLists?: TripOperationListModel[];

    @OneToMany(
        () => TripOperationListModel,
        (tripOperationList) => tripOperationList.endTime,
    )
    readonly endTripOperationLists?: TripOperationListModel[];
}

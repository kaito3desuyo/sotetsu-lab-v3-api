import { StationModel } from 'src/libs/station/infrastructure/models/station.model';
import { StopModel } from 'src/libs/station/infrastructure/models/stop.model';
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
    @Index()
    tripId: string;

    @Column('uuid')
    @Index()
    stationId: string;

    @Column('uuid', { nullable: true })
    @Index()
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
    readonly createdAt?: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    readonly updatedAt?: Date;

    @ManyToOne(() => TripModel, (trip) => trip.times, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'trip_id' })
    readonly trip?: TripModel;

    @ManyToOne(() => StationModel, (station) => station.times)
    @JoinColumn({ name: 'station_id' })
    readonly station?: StationModel;

    @ManyToOne(() => StopModel, (stop) => stop.times)
    @JoinColumn({ name: 'stop_id' })
    readonly stop?: StopModel;

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

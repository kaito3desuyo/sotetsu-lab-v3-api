import { OperationModel } from 'src/libs/operation/infrastructure/models/operation.model';
import { StationModel } from 'src/libs/station/infrastructure/models/station.model';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { TimeModel } from './time.model';
import { TripModel } from './trip.model';

@Entity({
    name: 'trip_operation_lists',
})
@Index(['operationId', 'startTimeId'])
@Index(['operationId', 'endTimeId'])
export class TripOperationListModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    @Index()
    tripId: string;

    @Column('uuid')
    @Index()
    operationId: string;

    @Column('uuid', { nullable: true })
    @Index()
    startStationId: string;

    @Column('uuid', { nullable: true })
    @Index()
    endStationId: string;

    @Column('uuid', { nullable: true })
    @Index()
    startTimeId: string;

    @Column('uuid', { nullable: true })
    @Index()
    endTimeId: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    readonly createdAt?: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    readonly updatedAt?: Date;

    @ManyToOne(() => TripModel, (trip) => trip.tripOperationLists, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'trip_id' })
    readonly trip?: TripModel;

    @ManyToOne(
        () => OperationModel,
        (operation) => operation.tripOperationLists,
    )
    @JoinColumn({ name: 'operation_id' })
    readonly operation?: OperationModel;

    @ManyToOne(() => TimeModel, (time) => time.startTripOperationLists)
    @JoinColumn({ name: 'start_time_id' })
    readonly startTime?: TimeModel;

    @ManyToOne(() => TimeModel, (time) => time.endTripOperationLists)
    @JoinColumn({ name: 'end_time_id' })
    readonly endTime?: TimeModel;

    @ManyToOne(() => StationModel, (station) => station)
    @JoinColumn({ name: 'start_station_id' })
    readonly startStation?: StationModel;

    @ManyToOne(() => StationModel, (station) => station)
    @JoinColumn({ name: 'end_station_id' })
    readonly endStation?: StationModel;
}

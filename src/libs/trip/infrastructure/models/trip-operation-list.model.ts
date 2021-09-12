// tslint:disable: variable-name

import { OperationModel } from 'src/libs/operation/infrastructure/models/operation.model';
import { Operation } from 'src/main/v1/operation/operation.entity';
import { Station } from 'src/main/v1/station/station.entity';
import { Time } from 'src/main/v1/time/time.entity';
import { Trip } from 'src/main/v1/trip/trip.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
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
    tripId: string;

    @Column('uuid')
    @Index()
    operationId: string;

    @Column('uuid', { nullable: true })
    startTimeId: string;

    @Column('uuid', { nullable: true })
    endTimeId: string;

    @Column('uuid', { nullable: true })
    startStationId: string;

    @Column('uuid', { nullable: true })
    endStationId: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt: Date;

    @ManyToOne(() => TripModel, (trip) => trip.tripOperationLists, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'trip_id' })
    trip?: TripModel;

    @ManyToOne(
        () => OperationModel,
        (operation) => operation.tripOperationLists,
    )
    @JoinColumn({ name: 'operation_id' })
    operation?: OperationModel;

    @ManyToOne(() => TimeModel, (time) => time.startTripOperationLists)
    @JoinColumn({ name: 'start_time_id' })
    startTime?: TimeModel;

    @ManyToOne(() => TimeModel, (time) => time.endTripOperationLists)
    @JoinColumn({ name: 'end_time_id' })
    endTime?: TimeModel;

    @ManyToOne(() => Station, (station) => station)
    @JoinColumn({ name: 'start_station_id' })
    startStation?: Station;

    @ManyToOne(() => Station, (station) => station)
    @JoinColumn({ name: 'end_station_id' })
    endStation?: Station;
}

import { OperationModel } from '../../../operation/infrastructure/models/operation.model.js';
import { StationModel } from '../../../station/infrastructure/models/station.model.js';
import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    type Relation,
} from 'typeorm';
import { TimeModel } from './time.model.js';
import { TripModel } from './trip.model.js';

@Entity({
    name: 'trip_operation_lists',
})
@Index(['operationId', 'startTimeId'])
@Index(['operationId', 'endTimeId'])
@Check(
    `"next_trip_operation_list_id" IS NULL OR "next_trip_operation_list_id" <> "id"`,
)
export class TripOperationListModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    @Index()
    tripId!: string;

    @Column('uuid')
    @Index()
    operationId!: string;

    @Column('uuid', { nullable: true })
    @Index()
    startStationId!: string;

    @Column('uuid', { nullable: true })
    @Index()
    endStationId!: string;

    @Column('uuid', { nullable: true })
    @Index()
    startTimeId!: string;

    @Column('uuid', { nullable: true })
    @Index()
    endTimeId!: string;

    /** この区間のあと、車両が移る区間（spec 3.6 決まり 2）。同じカレンダーの運用の区間に限る */
    @Column('uuid', { nullable: true })
    @Index({ unique: true })
    nextTripOperationListId?: string | null;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    readonly createdAt?: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    readonly updatedAt?: Date;

    @ManyToOne(() => TripModel, (trip) => trip.tripOperationLists, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'trip_id' })
    readonly trip?: Relation<TripModel>;

    @ManyToOne(
        () => OperationModel,
        (operation) => operation.tripOperationLists,
    )
    @JoinColumn({ name: 'operation_id' })
    readonly operation?: Relation<OperationModel>;

    @ManyToOne(() => TimeModel, (time) => time.startTripOperationLists)
    @JoinColumn({ name: 'start_time_id' })
    readonly startTime?: Relation<TimeModel>;

    @ManyToOne(() => TimeModel, (time) => time.endTripOperationLists)
    @JoinColumn({ name: 'end_time_id' })
    readonly endTime?: Relation<TimeModel>;

    @ManyToOne(() => StationModel, (station) => station)
    @JoinColumn({ name: 'start_station_id' })
    readonly startStation?: Relation<StationModel>;

    @ManyToOne(() => StationModel, (station) => station)
    @JoinColumn({ name: 'end_station_id' })
    readonly endStation?: Relation<StationModel>;

    @ManyToOne(() => TripOperationListModel, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'next_trip_operation_list_id' })
    readonly nextTripOperationList?: Relation<TripOperationListModel>;
}

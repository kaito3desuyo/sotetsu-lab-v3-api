import { ServiceModel } from 'src/libs/service/infrastructure/models/service.model';
import { TripClassModel } from 'src/libs/trip-class/infrastructure/models/trip-class.model';
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
import { TimeModel } from './time.model';
import { TripBlockModel } from '../../../trip-block/infrastructure/models/trip-block.model';
import { TripOperationListModel } from './trip-operation-list.model';

@Entity({
    name: 'trips',
})
@Index(['calendarId', 'tripDirection'])
export class TripModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    serviceId: string;

    @Column('varchar')
    tripNumber: string;

    @Column('uuid')
    tripClassId: string;

    @Column('varchar', { nullable: true })
    tripName: string;

    @Column('smallint')
    tripDirection: number;

    @Column('uuid')
    @Index()
    tripBlockId: string;

    @Column('boolean')
    depotIn: boolean;

    @Column('boolean')
    depotOut: boolean;

    @Column('uuid', { nullable: true })
    calendarId: string;

    @Column('uuid', { nullable: true })
    extraCalendarId: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    readonly createdAt?: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    readonly updatedAt?: Date;

    @OneToMany(() => TimeModel, (time) => time.trip, {
        cascade: true,
    })
    readonly times?: TimeModel[];

    @OneToMany(
        () => TripOperationListModel,
        (tripOperationList) => tripOperationList.trip,
        { cascade: true },
    )
    readonly tripOperationLists?: TripOperationListModel[];

    @ManyToOne(() => ServiceModel, (service) => service.trips)
    @JoinColumn({ name: 'service_id' })
    readonly service?: ServiceModel;

    @ManyToOne(() => TripClassModel, (tripClass) => tripClass.trips)
    @JoinColumn({ name: 'trip_class_id' })
    readonly tripClass?: TripClassModel;

    @ManyToOne(() => TripBlockModel, (tripBlock) => tripBlock.trips)
    @JoinColumn({ name: 'trip_block_id' })
    readonly tripBlock?: TripBlockModel;
}

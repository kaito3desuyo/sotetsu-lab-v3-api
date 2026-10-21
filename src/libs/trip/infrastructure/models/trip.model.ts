import { ServiceModel } from '../../../service/infrastructure/models/service.model.js';
import { TripClassModel } from '../../../trip-class/infrastructure/models/trip-class.model.js';
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
    type Relation,
} from 'typeorm';
import { TimeModel } from './time.model.js';
import { TripBlockModel } from '../../../trip-block/infrastructure/models/trip-block.model.js';
import { TripOperationListModel } from './trip-operation-list.model.js';

@Entity({
    name: 'trips',
})
@Index(['calendarId', 'tripDirection'])
export class TripModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    @Index()
    serviceId!: string;

    @Column('varchar')
    tripNumber!: string;

    @Column('uuid')
    @Index()
    tripClassId!: string;

    @Column('varchar', { nullable: true })
    tripName!: string | null;

    @Column('smallint')
    tripDirection!: number;

    @Column('uuid')
    @Index()
    tripBlockId!: string;

    @Column('boolean')
    depotIn!: boolean;

    @Column('boolean')
    depotOut!: boolean;

    @Column('uuid', { nullable: true })
    @Index()
    calendarId!: string | null;

    @Column('uuid', { nullable: true })
    @Index()
    extraCalendarId!: string | null;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    readonly createdAt?: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    readonly updatedAt?: Date;

    @OneToMany(() => TimeModel, (time) => time.trip, {
        cascade: true,
    })
    readonly times?: Relation<TimeModel[]>;

    @OneToMany(
        () => TripOperationListModel,
        (tripOperationList) => tripOperationList.trip,
        { cascade: true },
    )
    readonly tripOperationLists?: Relation<TripOperationListModel[]>;

    @ManyToOne(() => ServiceModel, (service) => service.trips)
    @JoinColumn({ name: 'service_id' })
    readonly service?: Relation<ServiceModel>;

    @ManyToOne(() => TripClassModel, (tripClass) => tripClass.trips)
    @JoinColumn({ name: 'trip_class_id' })
    readonly tripClass?: Relation<TripClassModel>;

    @ManyToOne(() => TripBlockModel, (tripBlock) => tripBlock.trips)
    @JoinColumn({ name: 'trip_block_id' })
    readonly tripBlock?: Relation<TripBlockModel>;
}

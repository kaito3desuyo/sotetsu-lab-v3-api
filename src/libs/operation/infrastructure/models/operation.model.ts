import { CalendarModel } from '../../../calendar/infrastructure/models/calendar.model.js';
import { OperationSightingModel } from '../../../operation-sighting/infrastructure/models/operation-sighting.model.js';
import { TripOperationListModel } from '../../../trip/infrastructure/models/trip-operation-list.model.js';
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

@Entity({
    name: 'operations',
})
export class OperationModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    @Index()
    calendarId!: string;

    @Column('varchar')
    @Index()
    operationNumber!: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt!: Date;

    @ManyToOne(() => CalendarModel, (calendar) => calendar.operations)
    @JoinColumn({ name: 'calendar_id' })
    readonly calendar?: Relation<CalendarModel>;

    @OneToMany(
        () => TripOperationListModel,
        (tripOperationList) => tripOperationList.operation,
    )
    readonly tripOperationLists?: Relation<TripOperationListModel[]>;

    @OneToMany(
        () => OperationSightingModel,
        (operationSighting) => operationSighting.operation,
    )
    readonly operationSightings?: Relation<OperationSightingModel[]>;
}

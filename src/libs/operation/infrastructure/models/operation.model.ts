import { CalendarModel } from 'src/libs/calendar/infrastructure/models/calendar.model';
import { TripOperationListModel } from 'src/libs/trip/infrastructure/models/trip-operation-list.model';
import { OperationSighting } from 'src/main/v1/operation/operation-sighting.entity';
import { TripOperationList } from 'src/main/v1/trip-operation-list/trip_operation_list.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
    Index,
} from 'typeorm';

@Entity({
    name: 'operations',
})
export class OperationModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    @Index()
    calendarId: string;

    @Column('varchar')
    operationNumber: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt: Date;

    @ManyToOne(() => CalendarModel, (calendar) => calendar.operations)
    @JoinColumn({ name: 'calendar_id' })
    readonly calendar?: CalendarModel;

    @OneToMany(
        () => TripOperationListModel,
        (tripOperationList) => tripOperationList.operation,
    )
    readonly tripOperationLists?: TripOperationListModel[];

    @OneToMany(
        () => OperationSighting,
        (operationSighting) => operationSighting.operation,
    )
    readonly operationSightings?: OperationSighting[];
}

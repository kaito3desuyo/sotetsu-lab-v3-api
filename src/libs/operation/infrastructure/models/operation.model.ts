import { CalendarModel } from 'src/libs/calendar/infrastructure/models/calendar.model';
import { OperationSightingModel } from 'src/libs/operation-sighting/infrastructure/models/operation-sighting.model';
import { TripOperationListModel } from 'src/libs/trip/infrastructure/models/trip-operation-list.model';
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
        () => OperationSightingModel,
        (operationSighting) => operationSighting.operation,
    )
    readonly operationSightings?: OperationSightingModel[];
}

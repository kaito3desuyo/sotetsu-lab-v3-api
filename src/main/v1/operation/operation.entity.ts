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
import { Calendar } from '../calendar/calendar.entity';
import { OperationSighting } from './operation-sighting.entity';
import { TripOperationList } from '../trip-operation-list/trip_operation_list.entity';
/* tslint:disable: variable-name */

@Entity({
    name: 'operations',
})
export class Operation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    @Index()
    calendar_id: string;

    @Column('varchar')
    operation_number: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updated_at: Date;

    @ManyToOne(type => Calendar, calendar => calendar.operations)
    @JoinColumn({ name: 'calendar_id' })
    readonly calendar?: Calendar;

    @OneToMany(
        type => TripOperationList,
        tripOperationList => tripOperationList.operation,
    )
    readonly trip_operation_lists?: TripOperationList[];

    @OneToMany(
        type => OperationSighting,
        operationSighting => operationSighting.operation,
    )
    readonly operation_sightings?: OperationSighting[];
}

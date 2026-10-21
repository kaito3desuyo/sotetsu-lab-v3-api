import { CalendarModel } from '../../../calendar/infrastructure/models/calendar.model.js';
import { TripClassModel } from '../../../trip-class/infrastructure/models/trip-class.model.js';
import { TripModel } from '../../../trip/infrastructure/models/trip.model.js';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    type Relation,
} from 'typeorm';
import { OperatingSystemModel } from './operating-system.model.js';

@Entity({
    name: 'services',
})
export class ServiceModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('varchar')
    serviceName!: string;

    @Column('text', { nullable: true })
    serviceDescription!: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt!: string;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt!: string;

    @OneToMany(() => CalendarModel, (calendar) => calendar.service)
    readonly calendars?: Relation<CalendarModel[]>;

    @OneToMany(
        () => OperatingSystemModel,
        (operatingSystem) => operatingSystem.service,
    )
    readonly operatingSystems?: Relation<OperatingSystemModel[]>;

    @OneToMany(() => TripModel, (trip) => trip.service)
    readonly trips?: Relation<TripModel[]>;

    @OneToMany((_type) => TripClassModel, (tripClass) => tripClass.service)
    readonly tripClasses?: Relation<TripClassModel[]>;
}

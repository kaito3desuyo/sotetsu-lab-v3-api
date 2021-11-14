import { CalendarModel } from 'src/libs/calendar/infrastructure/models/calendar.model';
import { TripModel } from 'src/libs/trip/infrastructure/models/trip.model';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { OperatingSystemModel } from './operating-system.model';

@Entity({
    name: 'services',
})
export class ServiceModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('varchar')
    serviceName: string;

    @Column('text', { nullable: true })
    serviceDescription: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt: string;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt: string;

    @OneToMany(() => CalendarModel, (calendar) => calendar.service)
    readonly calendars?: CalendarModel[];

    @OneToMany(
        () => OperatingSystemModel,
        (operatingSystem) => operatingSystem.service,
    )
    readonly operatingSystems?: OperatingSystemModel[];

    @OneToMany(() => TripModel, (trip) => trip.service)
    readonly trips?: TripModel[];

    // @OneToMany(type => TripClass, tripClass => tripClass.service)
    // readonly trip_classes?: TripClass[];
}

import { Operation } from 'src/main/v1/operation/operation.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';

@Entity({
    name: 'calendars',
})
export class CalendarModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    serviceId: string;

    @Column('varchar')
    calendarName: string;

    @Column('boolean')
    sunday: boolean;

    @Column('boolean')
    monday: boolean;

    @Column('boolean')
    tuesday: boolean;

    @Column('boolean')
    wednesday: boolean;

    @Column('boolean')
    thursday: boolean;

    @Column('boolean')
    friday: boolean;

    @Column('boolean')
    saturday: boolean;

    @Column('date')
    startDate: string;

    @Column('date', { nullable: true })
    endDate: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt: Date;

    @OneToMany(() => Operation, (operation) => operation.calendar)
    readonly operations?: Operation[];
}

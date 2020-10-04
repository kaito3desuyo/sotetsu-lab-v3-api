import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { Operation } from '../operation/operation.entity';

// tslint:disable: variable-name

@Entity({
    name: 'calendars',
})
export class Calendar {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    service_id: string;

    @Column('varchar')
    calendar_name: string;

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
    start_date: string;

    @Column('date', { nullable: true })
    end_date: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updated_at: Date;

    @OneToMany((type) => Operation, (operation) => operation.calendar)
    readonly operations?: Operation[];
}

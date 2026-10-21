import { OperationModel } from '../../../operation/infrastructure/models/operation.model.js';
import { ServiceModel } from '../../../service/infrastructure/models/service.model.js';
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
    name: 'calendars',
})
export class CalendarModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    @Index()
    serviceId!: string;

    @Column('varchar')
    calendarName!: string;

    @Column('boolean')
    sunday!: boolean;

    @Column('boolean')
    monday!: boolean;

    @Column('boolean')
    tuesday!: boolean;

    @Column('boolean')
    wednesday!: boolean;

    @Column('boolean')
    thursday!: boolean;

    @Column('boolean')
    friday!: boolean;

    @Column('boolean')
    saturday!: boolean;

    @Column('date')
    startDate!: string;

    @Column('date', { nullable: true })
    endDate!: string | null;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt!: Date;

    @OneToMany(() => OperationModel, (operation) => operation.calendar)
    readonly operations?: Relation<OperationModel[]>;

    @ManyToOne(() => ServiceModel, (service) => service.calendars)
    @JoinColumn({ name: 'service_id' })
    readonly service?: Relation<ServiceModel>;
}

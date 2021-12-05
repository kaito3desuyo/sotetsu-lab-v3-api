import { ServiceModel } from 'src/libs/service/infrastructure/models/service.model';
import { TripModel } from 'src/libs/trip/infrastructure/models/trip.model';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
} from 'typeorm';

@Entity({
    name: 'trip_classes',
})
export class TripClassModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    serviceId: string;

    @Column('varchar')
    tripClassName: string;

    @Column('varchar')
    tripClassColor: string;

    @Column('smallint')
    sequence: number;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt: string;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt: string;

    @OneToMany(() => TripModel, (trip) => trip.tripClass)
    readonly trips?: TripModel[];

    @ManyToOne(() => ServiceModel, (service) => service.tripClasses)
    @JoinColumn({ name: 'service_id' })
    readonly service?: ServiceModel;
}

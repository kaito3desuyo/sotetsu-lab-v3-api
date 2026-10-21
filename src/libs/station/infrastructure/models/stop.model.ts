import { TimeModel } from '../../../trip/infrastructure/models/time.model.js';
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
import { StationModel } from './station.model.js';

@Entity({
    name: 'stops',
})
export class StopModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    @Index()
    stationId!: string;

    @Column('varchar')
    stopName!: string;

    @Column('text', { nullable: true })
    stopDescription!: string;

    @Column({
        type: 'geometry',
        spatialFeatureType: 'Point',
        srid: 4326,
        nullable: true,
    })
    stopLatlng!: string;

    @Column('uuid', { nullable: true })
    zoneId!: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt!: string;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt!: string;

    @OneToMany(() => TimeModel, (time) => time.stop)
    readonly times?: Relation<TimeModel[]>;

    @ManyToOne(() => StationModel, (station) => station.stops)
    @JoinColumn({ name: 'station_id' })
    readonly station?: Relation<StationModel>;
}

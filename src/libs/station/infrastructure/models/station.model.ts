import { RouteStationListModel } from '../../../route/infrastructure/models/route-station-list.model.js';
import { TimeModel } from '../../../trip/infrastructure/models/time.model.js';
import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    type Relation,
} from 'typeorm';
import { StopModel } from './stop.model.js';

@Entity({
    name: 'stations',
})
export class StationModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('varchar')
    stationName: string;

    @Column('varchar', { nullable: true })
    stationSubname: string;

    @Column('smallint')
    stationType: number;

    @Column('text', { nullable: true })
    stationDescription: string;

    @Column({
        type: 'geometry',
        spatialFeatureType: 'Point',
        srid: 4326,
        nullable: true,
    })
    stationLatlng: string;

    @Column('varchar', { nullable: true })
    stationUrl: string;

    @Column('boolean')
    wheelchairBoarding: boolean;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt: Date;

    @OneToMany(
        () => RouteStationListModel,
        (routeStationList) => routeStationList.station,
    )
    readonly routeStationLists?: Relation<RouteStationListModel[]>;

    @OneToMany(() => TimeModel, (time) => time.station)
    readonly times?: Relation<TimeModel[]>;

    @OneToMany(() => StopModel, (stop) => stop.station)
    readonly stops?: Relation<StopModel[]>;
}

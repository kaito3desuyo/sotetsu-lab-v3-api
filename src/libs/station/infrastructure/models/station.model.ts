// tslint:disable: variable-name

import { RouteStationListModel } from 'src/libs/route/infrastructure/models/route-station-list.model';
import { TimeModel } from 'src/libs/trip/infrastructure/models/time.model';
import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { StopModel } from './stop.model';

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
    readonly routeStationLists?: RouteStationListModel[];

    @OneToMany(() => TimeModel, (time) => time.station)
    readonly times?: TimeModel[];

    @OneToMany(() => StopModel, (stop) => stop.station)
    readonly stops?: StopModel[];
}

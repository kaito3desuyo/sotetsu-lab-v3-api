import { OperatingSystemModel } from '../../../service/infrastructure/models/operating-system.model.js';
import { StationModel } from '../../../station/infrastructure/models/station.model.js';
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
import { RouteModel } from './route.model.js';

@Entity({
    name: 'route_station_lists',
})
export class RouteStationListModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    @Index()
    routeId!: string;

    @Column('uuid')
    @Index()
    stationId!: string;

    @Column('smallint')
    stationSequence!: number;

    @Column('varchar', { nullable: true })
    stationNumbering!: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt!: string;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt!: string;

    @ManyToOne(() => RouteModel, (route) => route.routeStationLists)
    @JoinColumn({ name: 'route_id' })
    route!: Relation<RouteModel>;

    @ManyToOne(() => StationModel, (station) => station.routeStationLists)
    @JoinColumn({ name: 'station_id' })
    station!: Relation<StationModel>;

    @OneToMany(
        () => OperatingSystemModel,
        (operatingSystem) => operatingSystem.startRouteStationList,
    )
    startOperatingSystems?: Relation<OperatingSystemModel>;

    @OneToMany(
        () => OperatingSystemModel,
        (operatingSystem) => operatingSystem.endRouteStationList,
    )
    endOperatingSystems?: Relation<OperatingSystemModel>;
}

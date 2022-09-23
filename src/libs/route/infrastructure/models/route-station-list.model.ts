import { OperatingSystemModel } from 'src/libs/service/infrastructure/models/operating-system.model';
import { StationModel } from 'src/libs/station/infrastructure/models/station.model';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { RouteModel } from './route.model';

@Entity({
    name: 'route_station_lists',
})
export class RouteStationListModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    routeId: string;

    @Column('uuid')
    stationId: string;

    @Column('smallint')
    stationSequence: number;

    @Column('varchar', { nullable: true })
    stationNumbering: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt: string;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt: string;

    @ManyToOne(() => RouteModel, (route) => route.routeStationLists)
    @JoinColumn({ name: 'route_id' })
    route: RouteModel;

    @ManyToOne(() => StationModel, (station) => station.routeStationLists)
    @JoinColumn({ name: 'station_id' })
    station: StationModel;

    @OneToMany(
        () => OperatingSystemModel,
        (operatingSystem) => operatingSystem.startRouteStationList,
    )
    startOperatingSystems?: OperatingSystemModel;

    @OneToMany(
        () => OperatingSystemModel,
        (operatingSystem) => operatingSystem.endRouteStationList,
    )
    endOperatingSystems?: OperatingSystemModel;
}

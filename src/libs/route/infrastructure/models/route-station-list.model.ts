import { StationModel } from 'src/libs/station/infrastructure/models/station.model';
import { OperatingSystem } from 'src/main/v1/operating-system/operating-system.entity';
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
        (type) => OperatingSystem,
        (operatingSystem) => operatingSystem.start_route_station_list,
    )
    start_operating_systems?: OperatingSystem;

    @OneToMany(
        (type) => OperatingSystem,
        (operatingSystem) => operatingSystem.end_route_station_list,
    )
    end_operating_systems?: OperatingSystem;
}

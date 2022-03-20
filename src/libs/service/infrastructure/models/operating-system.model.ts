import { RouteStationListModel } from 'src/libs/route/infrastructure/models/route-station-list.model';
import { RouteModel } from 'src/libs/route/infrastructure/models/route.model';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { ServiceModel } from './service.model';

@Entity({
    name: 'operating_systems',
})
export class OperatingSystemModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    serviceId: string;

    @Column('uuid')
    routeId: string;

    @Column('uuid')
    startRouteStationListId: string;

    @Column('uuid')
    endRouteStationListId: string;

    @Column('smallint')
    sequence: number;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt: string;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt: string;

    @ManyToOne(() => ServiceModel, (service) => service.operatingSystems)
    @JoinColumn({ name: 'service_id' })
    readonly service?: ServiceModel;

    @ManyToOne(() => RouteModel, (route) => route.operatingSystems)
    @JoinColumn({ name: 'route_id' })
    readonly route?: RouteModel;

    @ManyToOne(
        () => RouteStationListModel,
        (routeStationList) => routeStationList.startOperatingSystems,
    )
    @JoinColumn({ name: 'start_route_station_list_id' })
    readonly startRouteStationList?: RouteStationListModel;

    @ManyToOne(
        () => RouteStationListModel,
        (routeStationList) => routeStationList.endOperatingSystems,
    )
    @JoinColumn({ name: 'end_route_station_list_id' })
    readonly endRouteStationList?: RouteStationListModel;
}

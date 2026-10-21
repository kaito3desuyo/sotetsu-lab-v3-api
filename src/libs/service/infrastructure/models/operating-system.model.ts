import { RouteStationListModel } from '../../../route/infrastructure/models/route-station-list.model.js';
import { RouteModel } from '../../../route/infrastructure/models/route.model.js';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    type Relation,
} from 'typeorm';
import { ServiceModel } from './service.model.js';

@Entity({
    name: 'operating_systems',
})
export class OperatingSystemModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    @Index()
    serviceId!: string;

    @Column('uuid')
    @Index()
    routeId!: string;

    @Column('uuid')
    @Index()
    startRouteStationListId!: string;

    @Column('uuid')
    @Index()
    endRouteStationListId!: string;

    @Column('smallint')
    sequence!: number;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt!: string;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt!: string;

    @ManyToOne(() => ServiceModel, (service) => service.operatingSystems)
    @JoinColumn({ name: 'service_id' })
    readonly service?: Relation<ServiceModel>;

    @ManyToOne(() => RouteModel, (route) => route.operatingSystems)
    @JoinColumn({ name: 'route_id' })
    readonly route?: Relation<RouteModel>;

    @ManyToOne(
        () => RouteStationListModel,
        (routeStationList) => routeStationList.startOperatingSystems,
    )
    @JoinColumn({ name: 'start_route_station_list_id' })
    readonly startRouteStationList?: Relation<RouteStationListModel>;

    @ManyToOne(
        () => RouteStationListModel,
        (routeStationList) => routeStationList.endOperatingSystems,
    )
    @JoinColumn({ name: 'end_route_station_list_id' })
    readonly endRouteStationList?: Relation<RouteStationListModel>;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Service } from '../service/service.entity';
import { Route } from '../route/route.entity';
import { RouteStationList } from '../route-station-list/route-station-list.entity';
// tslint:disable: variable-name
@Entity({
  name: 'operating_systems',
})
export class OperatingSystem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  service_id: string;

  @Column('uuid')
  route_id: string;

  @Column('uuid')
  start_route_station_list_id: string;

  @Column('uuid')
  end_route_station_list_id: string;

  @Column('smallint')
  sequence: number;

  @CreateDateColumn({ type: 'timestamptz', precision: 3 })
  created_at: string;

  @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
  updated_at: string;

  @ManyToOne(type => Service, service => service.operating_systems)
  @JoinColumn({ name: 'service_id' })
  readonly service?: Service;

  @ManyToOne(type => Route, route => route.operating_systems)
  @JoinColumn({ name: 'route_id' })
  readonly route?: Route;

  @ManyToOne(
    type => RouteStationList,
    routeStationList => routeStationList.start_operating_systems,
  )
  @JoinColumn({ name: 'start_route_station_list_id' })
  readonly start_route_station_list?: RouteStationList;

  @ManyToOne(
    type => RouteStationList,
    routeStationList => routeStationList.end_operating_systems,
  )
  @JoinColumn({ name: 'end_route_station_list_id' })
  readonly end_route_station_list?: RouteStationList;
}

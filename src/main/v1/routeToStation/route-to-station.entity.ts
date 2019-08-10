// tslint:disable: variable-name

import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Route } from '../route/route.entity';
import { Station } from '../station/station.entity';

@Entity({
  name: 'route_station_lists',
})
export class RouteToStation {
  @PrimaryGeneratedColumn()
  id: string;

  @ManyToOne(type => Route, route => route.route_to_stations)
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @ManyToOne(type => Station, station => station.station_to_routes)
  @JoinColumn({ name: 'station_id' })
  station: Station;

  @Column()
  station_sequence: number;

  @Column()
  station_numbering: string;

  @CreateDateColumn()
  created_at: string;

  @UpdateDateColumn()
  updated_at: string;
}

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
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  route_id: string;

  @Column('uuid')
  station_id: string;

  @Column('smallint')
  station_sequence: number;

  @Column('varchar', { nullable: true })
  station_numbering: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: string;

  @ManyToOne(type => Route, route => route.route_to_stations)
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @ManyToOne(type => Station, station => station.station_to_routes)
  @JoinColumn({ name: 'station_id' })
  station: Station;
}

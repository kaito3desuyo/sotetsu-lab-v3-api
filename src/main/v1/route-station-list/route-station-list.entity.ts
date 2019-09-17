// tslint:disable: variable-name

import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Route } from '../route/route.entity';
import { Station } from '../station/station.entity';
import { OperatingSystem } from '../operating-system/operating-system.entity';

@Entity({
  name: 'route_station_lists',
})
export class RouteStationList {
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

  @ManyToOne(type => Route, route => route.route_station_lists)
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @ManyToOne(type => Station, station => station.route_station_lists)
  @JoinColumn({ name: 'station_id' })
  station: Station;

  @OneToMany(
    type => OperatingSystem,
    operatingSystem => operatingSystem.start_route_station_list,
  )
  start_operating_systems?: OperatingSystem;

  @OneToMany(
    type => OperatingSystem,
    operatingSystem => operatingSystem.end_route_station_list,
  )
  end_operating_systems?: OperatingSystem;
}

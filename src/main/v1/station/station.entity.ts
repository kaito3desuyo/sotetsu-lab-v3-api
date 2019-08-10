// tslint:disable: variable-name

import {
  Entity,
  PrimaryGeneratedColumn,
  OneToMany,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RouteToStation } from '../routeToStation/route-to-station.entity';

@Entity({
  name: 'stations',
})
export class Station {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  station_name: string;

  @Column()
  station_subname: string;

  @Column()
  station_type: number;

  @Column()
  station_description: string;

  @Column()
  station_latlng: string;

  @Column()
  station_url: string;

  @Column()
  wheelchair_boarding: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(type => RouteToStation, routeToStation => routeToStation.station)
  station_to_routes: RouteToStation[];
}

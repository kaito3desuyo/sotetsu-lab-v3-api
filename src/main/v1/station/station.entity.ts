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
import { Stop } from '../stop/stop.entity';
import { Time } from '../time/time.entity';

@Entity({
  name: 'stations',
})
export class Station {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar')
  station_name: string;

  @Column('varchar', { nullable: true })
  station_subname: string;

  @Column('smallint')
  station_type: number;

  @Column('text', { nullable: true })
  station_description: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  station_latlng: string;

  @Column('varchar', { nullable: true })
  station_url: string;

  @Column('boolean')
  wheelchair_boarding: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(type => RouteToStation, routeToStation => routeToStation.station)
  readonly station_to_routes?: RouteToStation[];

  @OneToMany(type => Time, time => time.station)
  readonly times?: Time[];

  @OneToMany(type => Stop, stop => stop.station)
  readonly stops?: Stop[];
}

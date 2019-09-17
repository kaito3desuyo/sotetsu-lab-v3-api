// tslint:disable: variable-name

import {
  Entity,
  PrimaryGeneratedColumn,
  OneToMany,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Stop } from '../stop/stop.entity';
import { Time } from '../time/time.entity';
import { RouteStationList } from '../route-station-list/route-station-list.entity';

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

  @OneToMany(
    type => RouteStationList,
    routeStationList => routeStationList.station,
  )
  readonly route_station_lists?: RouteStationList[];

  @OneToMany(type => Time, time => time.station)
  readonly times?: Time[];

  @OneToMany(type => Stop, stop => stop.station)
  readonly stops?: Stop[];
}

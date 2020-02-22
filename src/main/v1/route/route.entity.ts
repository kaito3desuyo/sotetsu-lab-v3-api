// tslint:disable: variable-name

import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Agency } from '../agency/agency.entity';
import { OperatingSystem } from '../operating-system/operating-system.entity';
import { RouteStationList } from '../route-station-list/route-station-list.entity';

@Entity({
  name: 'routes',
})
export class Route {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  agency_id: string;

  @Column('varchar', { nullable: true })
  route_number: string;

  @Column('varchar')
  route_name: string;

  @Column('varchar', { nullable: true })
  route_nickname: string;

  @Column('text', { nullable: true })
  route_description: string;

  @Column('smallint')
  route_type: number;

  @Column('varchar', { nullable: true })
  route_url: string;

  @Column('varchar', { nullable: true })
  route_color: string;

  @Column('varchar', { nullable: true })
  route_text_color: string;

  @CreateDateColumn({ type: 'timestamptz', precision: 3 })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
  updated_at: Date;

  @ManyToOne(type => Agency, agency => agency.routes)
  @JoinColumn({ name: 'agency_id' })
  readonly agency?: Agency;

  @OneToMany(
    type => RouteStationList,
    routeStationList => routeStationList.route,
  )
  readonly route_station_lists?: RouteStationList[];

  @OneToMany(type => OperatingSystem, operatingSystem => operatingSystem.route)
  readonly operating_systems?: OperatingSystem[];
}

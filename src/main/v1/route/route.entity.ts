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
import { RouteToStation } from '../routeToStation/route-to-station.entity';
import { ServiceToRoute } from '../serviceToRoute/service-to-route.entity';

@Entity({
  name: 'routes',
})
export class Route {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  agency_id: string;

  @Column('varchar', {nullable: true})
  route_number: string;

  @Column('varchar')
  route_name: string;

  @Column('varchar', {nullable: true})
  route_nickname: string;

  @Column('text', {nullable: true})
  route_description: string;

  @Column('smallint')
  route_type: number;

  @Column('varchar', {nullable: true})
  route_url: string;

  @Column('varchar', {nullable: true})
  route_color: string;

  @Column('varchar', {nullable: true})
  route_text_color: string;

  @CreateDateColumn({type: 'timestamptz'})
  created_at: Date;

  @UpdateDateColumn({type: 'timestamptz'})
  updated_at: Date;

  @ManyToOne(type => Agency, agency => agency.routes)
  @JoinColumn({ name: 'agency_id' })
  readonly agency?: Agency;

  @OneToMany(type => RouteToStation, routeToStation => routeToStation.route)
  readonly route_to_stations?: RouteToStation[];

  @OneToMany(type => ServiceToRoute, serviceToRoute => serviceToRoute.route)
  readonly route_to_services?: ServiceToRoute[];
}

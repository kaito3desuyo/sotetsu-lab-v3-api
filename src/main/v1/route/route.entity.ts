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

@Entity({
  name: 'routes',
})
export class Route {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  route_number: number;

  @Column()
  route_name: string;

  @Column()
  route_nickname: string;

  @Column()
  route_description: string;

  @Column()
  route_type: number;

  @Column()
  route_url: string;

  @Column()
  route_color: string;

  @Column()
  route_text_color: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(type => Agency, agency => agency.routes)
  @JoinColumn({ name: 'agency_id' })
  readonly agency?: Agency;

  @OneToMany(type => RouteToStation, routeToStation => routeToStation.route)
  route_to_stations: RouteToStation[];
}

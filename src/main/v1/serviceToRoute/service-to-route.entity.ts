import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Service } from '../service/service.entity';
import { Route } from '../route/route.entity';
// tslint:disable: variable-name
@Entity({
  name: 'route_systems',
})
export class ServiceToRoute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  route_id: string;

  @Column('uuid')
  service_id: string;

  @Column('smallint')
  sequence: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: string;

  @ManyToOne(type => Service, service => service.service_to_routes)
  @JoinColumn({ name: 'service_id' })
  readonly service?: Service;

  @ManyToOne(type => Route, route => route.route_to_services)
  @JoinColumn({ name: 'route_id' })
  readonly route?: Route;
}

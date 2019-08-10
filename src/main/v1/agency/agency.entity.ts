// tslint:disable: variable-name

import {
  Entity,
  PrimaryGeneratedColumn,
  OneToMany,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Route } from '../route/route.entity';

@Entity({
  name: 'agencies',
})
export class Agency {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  agency_number: string;

  @Column()
  parent_agency_number: string;

  @Column()
  agency_official_name: string;

  @Column()
  agency_name: string;

  @Column()
  agency_type: number;

  @Column()
  agency_url: string;

  @Column()
  agency_phone: string;

  @Column()
  agency_fare_url: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(type => Route, route => route.agency)
  routes?: Route[];
}

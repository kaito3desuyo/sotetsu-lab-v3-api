import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Service } from '../service/service.entity';
import { Trip } from './trip.entity';
// tslint:disable: variable-name
@Entity({
  name: 'trip_classes',
})
export class TripClass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  service_id: string;

  @Column('varchar')
  trip_class_name: string;

  @Column('varchar')
  trip_class_color: string;

  @Column('smallint')
  sequence: number;

  @CreateDateColumn({ type: 'timestamptz', precision: 3 })
  created_at: string;

  @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
  updated_at: string;

  @OneToMany(type => Trip, trip => trip.trip_class)
  readonly trips?: Trip[];

  @ManyToOne(type => Service, service => service.trip_classes)
  @JoinColumn({ name: 'service_id' })
  readonly service?: Service;
}

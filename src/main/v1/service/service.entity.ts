import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TripClass } from '../trip/trip_class.entity';
import { Trip } from '../trip/trip.entity';
import { OperatingSystem } from '../operating-system/operating-system.entity';
// tslint:disable: variable-name
@Entity({
  name: 'services',
})
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar')
  service_name: string;

  @Column('text', { nullable: true })
  service_description: string;

  @CreateDateColumn({ type: 'timestamptz', precision: 3 })
  created_at: string;

  @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
  updated_at: string;

  @OneToMany(
    type => OperatingSystem,
    operatingSystem => operatingSystem.service,
  )
  readonly operating_systems?: OperatingSystem[];

  @OneToMany(type => Trip, trip => trip.service)
  readonly trips?: Trip[];

  @OneToMany(type => TripClass, tripClass => tripClass.service)
  readonly trip_classes?: TripClass[];
}

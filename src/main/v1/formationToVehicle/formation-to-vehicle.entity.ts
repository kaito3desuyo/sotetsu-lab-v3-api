import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Formation } from '../formation/formation.entity';
import { Vehicle } from '../vehicle/vehicle.entity';

/* tslint:disable: variable-name */
@Entity({
  name: 'vehicle_formations',
})
export class FormationToVehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  formation_id: string;

  @Column('uuid')
  vehicle_id: string;

  @Column('smallint')
  car_number: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(type => Formation, formation => formation.formation_to_vehicles)
  @JoinColumn({ name: 'formation_id' })
  readonly formation?: Formation;

  @ManyToOne(type => Vehicle, vehicle => vehicle.vehicle_to_formations)
  @JoinColumn({ name: 'vehicle_id' })
  readonly vehicle?: Vehicle;
}

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
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  formation_id: string;

  @Column()
  vehicle_id: string;

  @Column()
  car_number: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(type => Formation, formation => formation.formation_to_vehicles)
  @JoinColumn({ name: 'formation_id' })
  formation?: Formation;

  @ManyToOne(type => Vehicle, vehicle => vehicle.vehicle_to_formations)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle;
}

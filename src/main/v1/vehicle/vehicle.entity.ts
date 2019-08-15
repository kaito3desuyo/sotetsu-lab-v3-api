import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { FormationToVehicle } from '../formationToVehicle/formation-to-vehicle.entity';

/* tslint:disable: variable-name */
@Entity({
  name: 'vehicles',
})
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  vehicle_number: string;

  @Column()
  belongs: string;

  @Column({
    type: 'date',
  })
  production_date: Date;

  @Column({
    type: 'date',
  })
  scrapped_date: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(
    type => FormationToVehicle,
    formationToVehicle => formationToVehicle.vehicle,
  )
  vehicle_to_formations?: FormationToVehicle[];
}

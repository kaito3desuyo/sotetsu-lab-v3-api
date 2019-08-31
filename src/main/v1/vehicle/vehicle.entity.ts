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
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', {
    unique: true
  })
  vehicle_number: string;

  @Column('varchar')
  belongs: string;

  @Column('date', {nullable: true})
  production_date: Date;

  @Column('date', {nullable: true})
  scrapped_date: Date;

  @CreateDateColumn({type: 'timestamptz'})
  created_at: Date;

  @UpdateDateColumn({type: 'timestamptz'})
  updated_at: Date;

  @OneToMany(
    type => FormationToVehicle,
    formationToVehicle => formationToVehicle.vehicle,
  )
  vehicle_to_formations?: FormationToVehicle[];
}

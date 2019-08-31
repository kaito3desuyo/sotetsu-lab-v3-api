import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OperationSighting } from '../operation/operation-sighting.entity';
import { FormationToVehicle } from '../formationToVehicle/formation-to-vehicle.entity';

/* tslint:disable: variable-name */
@Entity({
  name: 'formations',
})
export class Formation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  agency_id: string;

  @Column('varchar')
  vehicle_type: string;

  @Column('varchar')
  formation_number: string;

  @Column('text', {nullable: true})
  formation_description: string;

  @Column('date', {nullable: true})
  start_date: Date;

  @Column('date', {nullable: true})
  end_date: Date;

  @CreateDateColumn({type: 'timestamptz'})
  created_at: Date;

  @UpdateDateColumn({type: 'timestamptz'})
  updated_at: Date;

  @OneToMany(
    type => OperationSighting,
    operationSighting => operationSighting.formation,
  )
  operation_sightings?: OperationSighting[];

  @OneToMany(
    type => FormationToVehicle,
    formationToVehicle => formationToVehicle.formation,
  )
  formation_to_vehicles?: FormationToVehicle[];
}

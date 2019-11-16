import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OperationSighting } from '../operation/operation-sighting.entity';
import { VehicleFormation } from '../vehicle-formation/vehicle-formation.entity';
import { Agency } from '../agency/agency.entity';

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

  @Column('text', { nullable: true })
  formation_description: string;

  @Column('date', { nullable: true })
  start_date: string;

  @Column('date', { nullable: true })
  end_date: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(type => Agency, agency => agency.formations)
  @JoinColumn({ name: 'agency_id' })
  agency?: Agency;

  @OneToMany(
    type => OperationSighting,
    operationSighting => operationSighting.formation,
  )
  operation_sightings?: OperationSighting[];

  @OneToMany(
    type => VehicleFormation,
    vehicleFormation => vehicleFormation.formation,
    {
      cascade: true,
    },
  )
  vehicle_formations?: VehicleFormation[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OperationSighting } from '../operation/operation-sighting.entity';

/* tslint:disable: variable-name */
@Entity({
  name: 'formations',
})
export class Formation {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  agency_id: string;

  @Column()
  vehicle_type: string;

  @Column()
  formation_number: string;

  @Column()
  formation_description: string;

  @Column({
    type: 'date',
  })
  start_date: Date;

  @Column({
    type: 'date',
  })
  end_date: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(
    type => OperationSighting,
    operationSighting => operationSighting.formation,
  )
  operation_sightings?: OperationSighting[];
}

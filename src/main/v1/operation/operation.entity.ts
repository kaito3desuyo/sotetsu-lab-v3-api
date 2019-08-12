import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Calender } from '../calender/calender.entity';
import { OperationSighting } from './operation-sighting.entity';
/* tslint:disable: variable-name */

@Entity({
  name: 'operations',
})
export class Operation {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  operation_number: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(type => Calender, calender => calender.operations)
  @JoinColumn({ name: 'calender_id' })
  readonly calender?: Calender;

  @OneToMany(
    type => OperationSighting,
    operationSighting => operationSighting.operation,
  )
  readonly operation_sightings?: OperationSighting[];
}

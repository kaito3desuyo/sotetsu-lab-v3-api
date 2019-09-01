import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Operation } from '../operation/operation.entity';

// tslint:disable: variable-name

@Entity({
  name: 'calenders',
})
export class Calender {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  service_id: string;

  @Column('varchar')
  calender_name: string;

  @Column('boolean')
  sunday: boolean;

  @Column('boolean')
  monday: boolean;

  @Column('boolean')
  tuesday: boolean;

  @Column('boolean')
  wednesday: boolean;

  @Column('boolean')
  thursday: boolean;

  @Column('boolean')
  friday: boolean;

  @Column('boolean')
  saturday: boolean;

  @Column('date')
  start_date: Date;

  @Column('date', { nullable: true })
  end_date: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(type => Operation, operation => operation.calender)
  readonly operations?: Operation[];
}

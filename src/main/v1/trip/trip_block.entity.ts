import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Trip } from './trip.entity';
// tslint:disable: variable-name
@Entity({
  name: 'trip_blocks',
})
export class TripBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(type => Trip, trip => trip.trip_block, { cascade: true })
  readonly trips?: Trip[];
}

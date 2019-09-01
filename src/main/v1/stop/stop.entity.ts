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
import { Station } from '../station/station.entity';
import { Time } from '../time/time.entity';
// tslint:disable: variable-name
@Entity({
  name: 'stops',
})
export class Stop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  station_id: string;

  @Column('varchar')
  stop_name: string;

  @Column('text', { nullable: true })
  stop_description: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  stop_latlng: string;

  @Column('uuid', { nullable: true })
  zone_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: string;

  @OneToMany(type => Time, time => time.stop)
  readonly times?: Time[];

  @ManyToOne(type => Station, station => station.stops)
  @JoinColumn({ name: 'station_id' })
  readonly station?: Station;
}

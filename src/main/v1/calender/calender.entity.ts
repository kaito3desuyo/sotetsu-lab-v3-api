import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// tslint:disable: variable-name

@Entity({
  name: 'calenders',
})
export class Calender {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  calender_name: string;

  @Column()
  sunday: boolean;

  @Column()
  monday: boolean;

  @Column()
  tuesday: boolean;

  @Column()
  wednesday: boolean;

  @Column()
  thursday: boolean;

  @Column()
  friday: boolean;

  @Column()
  saturday: boolean;

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
}

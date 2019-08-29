import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { TripClass } from "./trip_class.entity";

@Entity({
    name: 'trips'
})
export class Trip {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    service_id: string

    @Column('uuid')
    operation_id: string

    @Column()
    trip_number: string;

    @Column('uuid')
    trip_class_id: string

    @Column()
    trip_name: string;

    @Column('smallint')
    trip_direction: number

    @Column('uuid')
    trip_block_id: string;

    @Column('uuid')
    calender_id: string;

    @Column('uuid')
    extra_calender_id: string;

    @CreateDateColumn()
    created_at: string;

    @UpdateDateColumn()
    updated_at: string;

    @OneToOne(type => TripClass)
    @JoinColumn({name: 'trip_class_id'})
    trip_class: string;
}
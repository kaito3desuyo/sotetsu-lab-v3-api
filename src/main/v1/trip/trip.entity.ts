import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { TripClass } from "./trip_class.entity";
import { Time } from "../time/time.entity";
import { Service } from "../service/service.entity";
import { Operation } from "../operation/operation.entity";

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

    @Column('varchar')
    trip_number: string;

    @Column('uuid')
    trip_class_id: string

    @Column('varchar', { nullable: true })
    trip_name: string;

    @Column('smallint')
    trip_direction: number

    @Column('uuid')
    trip_block_id: string;

    @Column('boolean')
    depot_in: boolean;

    @Column('boolean')
    depot_out: boolean;

    @Column('uuid', { nullable: true })
    calender_id: string;

    @Column('uuid', { nullable: true })
    extra_calender_id: string;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: string;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: string;

    @OneToMany(type => Time, time => time.trip, { cascade: true })
    readonly times?: Time[]

    @ManyToOne(type => Service, service => service.trips)
    @JoinColumn({name: 'service_id'})
    readonly service?: Service

    @ManyToOne(type => Operation, operation => operation.trips)
    @JoinColumn({name: 'operation_id'})
    readonly operation?: Operation

    @ManyToOne(type => TripClass, tripClass => tripClass.trips)
    @JoinColumn({ name: 'trip_class_id' })
    readonly trip_class?: TripClass;
}
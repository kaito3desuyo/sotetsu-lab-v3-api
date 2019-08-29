import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({
    name: 'times'
})
export class Time {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    trip_id: string;

    @Column('uuid')
    station_id: string;

    @Column('uuid')
    stop_id: string;

    @Column('int')
    stop_sequence: number;

    @Column('smallint')
    pickup_type: number;

    @Column('smallint')
    dropoff_type: number;

    @Column('int')
    arrival_days: number;

    @Column('time with time zone')
    arrival_time: string;

    @Column('int')
    departure_days: number;

    @Column('time with time zone')
    departure_time: string;

    @Column('bool')
    depot_in: boolean;

    @Column('bool')
    depot_out: boolean;
}
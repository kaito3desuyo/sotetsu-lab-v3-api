import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, OneToMany } from "typeorm";
import { ServiceToRoute } from "../serviceToRoute/service-to-route.entity";
import { TripClass } from "../trip/trip_class.entity";
import { Trip } from "../trip/trip.entity";

@Entity({
    name: 'services'
})
export class Service {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('varchar')
    service_name: string;

    @Column('text', { nullable: true })
    service_description: string;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: string;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: string

    @OneToMany(type => ServiceToRoute, serviceToRoute => serviceToRoute.service)
    readonly service_to_routes?: ServiceToRoute[];

    @OneToMany(type => Trip, trip => trip.service)
    readonly trips?: Trip[]

    @OneToMany(type => TripClass, tripClass => tripClass.service)
    readonly trip_classes?: TripClass[];
}
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity({
    name: 'trip_classes'
})
export class TripClass {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    service_id: string;

    @Column('varchar')
    trip_class_name: string;

    @Column('varchar')
    trip_class_color: string;

    @Column('smallint')
    sequence: number;

    @CreateDateColumn({type: 'timestamptz'})
    created_at: string

    @UpdateDateColumn({type: 'timestamptz'})
    updated_at: string

}
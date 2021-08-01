// tslint:disable: variable-name

import { Formation } from 'src/main/v1/formation/formation.entity';
import { Route } from 'src/main/v1/route/route.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    OneToMany,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({
    name: 'agencies',
})
export class AgencyModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('varchar')
    agency_number: string;

    @Column('varchar', { nullable: true })
    parent_agency_number: string;

    @Column('varchar')
    agency_official_name: string;

    @Column('varchar', { nullable: true })
    agency_name: string;

    @Column('smallint')
    agency_type: number;

    @Column('varchar', { nullable: true })
    agency_url: string;

    @Column('varchar', { nullable: true })
    agency_phone: string;

    @Column('varchar', { nullable: true })
    agency_fare_url: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updated_at: Date;

    @OneToMany(() => Route, (route) => route.agency)
    routes?: Route[];

    @OneToMany(() => Formation, (formation) => formation.agency)
    formations?: Formation[];
}

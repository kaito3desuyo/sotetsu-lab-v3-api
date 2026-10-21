import { FormationModel } from '../../../formation/infrastructure/models/formation.model.js';
import { RouteModel } from '../../../route/infrastructure/models/route.model.js';
import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    type Relation,
} from 'typeorm';

@Entity({
    name: 'agencies',
})
export class AgencyModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('varchar')
    agencyNumber: string;

    @Column('varchar', { nullable: true })
    parentAgencyNumber: string;

    @Column('varchar')
    agencyOfficialName: string;

    @Column('varchar', { nullable: true })
    agencyName: string;

    @Column('smallint')
    agencyType: number;

    @Column('varchar', { nullable: true })
    agencyUrl: string;

    @Column('varchar', { nullable: true })
    agencyPhone: string;

    @Column('varchar', { nullable: true })
    agencyFareUrl: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt: Date;

    @OneToMany(() => RouteModel, (route) => route.agency)
    routes?: Relation<RouteModel[]>;

    @OneToMany(() => FormationModel, (formation) => formation.agency)
    formations?: Relation<FormationModel[]>;
}

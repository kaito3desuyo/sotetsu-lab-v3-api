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

    @OneToMany(() => Route, (route) => route.agency)
    routes?: Route[];

    @OneToMany(() => Formation, (formation) => formation.agency)
    formations?: Formation[];
}

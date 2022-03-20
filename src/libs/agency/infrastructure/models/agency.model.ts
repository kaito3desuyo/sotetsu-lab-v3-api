import { RouteModel } from 'src/libs/route/infrastructure/models/route.model';
import { Formation } from 'src/main/v1/formation/formation.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
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

    @OneToMany(() => RouteModel, (route) => route.agency)
    routes?: RouteModel[];

    @OneToMany(() => Formation, (formation) => formation.agency)
    formations?: Formation[];
}

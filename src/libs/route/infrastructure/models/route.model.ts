import { AgencyModel } from 'src/libs/agency/infrastructure/models/agency.model';
import { Agency } from 'src/main/v1/agency/agency.entity';
import { OperatingSystem } from 'src/main/v1/operating-system/operating-system.entity';
import { RouteStationList } from 'src/main/v1/route-station-list/route-station-list.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    JoinColumn,
    ManyToOne,
    OneToMany,
    UpdateDateColumn,
} from 'typeorm';

@Entity({
    name: 'routes',
})
export class RouteModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    agencyId: string;

    @Column('varchar', { nullable: true })
    routeNumber: string;

    @Column('varchar')
    routeName: string;

    @Column('varchar', { nullable: true })
    routeNickname: string;

    @Column('text', { nullable: true })
    routeDescription: string;

    @Column('smallint')
    routeType: number;

    @Column('varchar', { nullable: true })
    routeUrl: string;

    @Column('varchar', { nullable: true })
    routeColor: string;

    @Column('varchar', { nullable: true })
    routeTextColor: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt: Date;

    @ManyToOne((type) => AgencyModel, (agency) => agency.routes)
    @JoinColumn({ name: 'agency_id' })
    readonly agency?: AgencyModel;

    @OneToMany(
        (type) => RouteStationList,
        (routeStationList) => routeStationList.route,
    )
    readonly route_station_lists?: RouteStationList[];

    @OneToMany(
        (type) => OperatingSystem,
        (operatingSystem) => operatingSystem.route,
    )
    readonly operating_systems?: OperatingSystem[];
}
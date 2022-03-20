import { AgencyModel } from 'src/libs/agency/infrastructure/models/agency.model';
import { OperatingSystemModel } from 'src/libs/service/infrastructure/models/operating-system.model';
import { OperatingSystem } from 'src/main/v1/operating-system/operating-system.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { RouteStationListModel } from './route-station-list.model';

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

    @ManyToOne(() => AgencyModel, (agency) => agency.routes)
    @JoinColumn({ name: 'agency_id' })
    readonly agency?: AgencyModel;

    @OneToMany(
        () => RouteStationListModel,
        (routeStationList) => routeStationList.route,
    )
    readonly routeStationLists?: RouteStationListModel[];

    @OneToMany(
        () => OperatingSystemModel,
        (operatingSystem) => operatingSystem.route,
    )
    readonly operatingSystems?: OperatingSystemModel[];
}

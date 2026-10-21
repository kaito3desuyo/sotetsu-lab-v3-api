import { AgencyModel } from '../../../agency/infrastructure/models/agency.model.js';
import { OperatingSystemModel } from '../../../service/infrastructure/models/operating-system.model.js';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    type Relation,
} from 'typeorm';
import { RouteStationListModel } from './route-station-list.model.js';

@Entity({
    name: 'routes',
})
export class RouteModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    @Index()
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
    readonly agency?: Relation<AgencyModel>;

    @OneToMany(
        () => RouteStationListModel,
        (routeStationList) => routeStationList.route,
    )
    readonly routeStationLists?: Relation<RouteStationListModel[]>;

    @OneToMany(
        () => OperatingSystemModel,
        (operatingSystem) => operatingSystem.route,
    )
    readonly operatingSystems?: Relation<OperatingSystemModel[]>;
}

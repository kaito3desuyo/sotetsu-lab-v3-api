import { AgencyModel } from 'src/libs/agency/infrastructure/models/agency.model';
import { OperationSightingModel } from 'src/libs/operation-sighting/infrastructure/models/operation-sighting.model';
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
} from 'typeorm';
import { VehicleFormationModel } from './vehicle-formation.model';

@Entity({
    name: 'formations',
})
export class FormationModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    @Index()
    agencyId: string;

    @Column('varchar')
    vehicleType: string;

    @Column('varchar')
    @Index()
    formationNumber: string;

    @Column('text', { nullable: true })
    formationDescription: string;

    @Column('date', { nullable: true })
    startDate: string;

    @Column('date', { nullable: true })
    endDate: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt: Date;

    @ManyToOne(() => AgencyModel, (agency) => agency.formations)
    @JoinColumn({ name: 'agency_id' })
    agency?: AgencyModel;

    @OneToMany(
        () => VehicleFormationModel,
        (vehicleFormation) => vehicleFormation.formation,
        {
            cascade: true,
        },
    )
    vehicleFormations?: VehicleFormationModel[];

    @OneToMany(
        () => OperationSightingModel,
        (operationSighting) => operationSighting.formation,
    )
    operationSightings?: OperationSightingModel[];
}

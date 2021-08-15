import { AgencyModel } from 'src/libs/agency/infrastructure/models/agency.model';
import { OperationSighting } from 'src/main/v1/operation/operation-sighting.entity';
import { VehicleFormation } from 'src/main/v1/vehicle-formation/vehicle-formation.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    ManyToOne,
    JoinColumn,
} from 'typeorm';

@Entity({
    name: 'formations',
})
export class FormationModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    agencyId: string;

    @Column('varchar')
    vehicleType: string;

    @Column('varchar')
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

    @ManyToOne((type) => AgencyModel, (agency) => agency.formations)
    @JoinColumn({ name: 'agency_id' })
    agency?: AgencyModel;

    @OneToMany(
        (type) => OperationSighting,
        (operationSighting) => operationSighting.formation,
    )
    operationSightings?: OperationSighting[];

    @OneToMany(
        (type) => VehicleFormation,
        (vehicleFormation) => vehicleFormation.formation,
        {
            cascade: true,
        },
    )
    vehicleFormations?: VehicleFormation[];
}

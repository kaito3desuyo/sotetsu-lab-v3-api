import { VehicleFormationModel } from 'src/libs/formation/infrastructure/models/vehicle-formation.model';
import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({
    name: 'vehicles',
})
export class VehicleModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('varchar', {
        unique: true,
    })
    vehicleNumber: string;

    @Column('varchar')
    belongs: string;

    @Column('date', { nullable: true })
    productionDate: string;

    @Column('date', { nullable: true })
    scrappedDate: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt: Date;

    @OneToMany(
        () => VehicleFormationModel,
        (vehicleFormation) => vehicleFormation.vehicle,
        {
            cascade: true,
        },
    )
    vehicleFormations?: VehicleFormationModel[];
}

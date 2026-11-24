import { VehicleFormationModel } from '../../../formation/infrastructure/models/vehicle-formation.model.js';
import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    type Relation,
} from 'typeorm';
import { VehicleModificationModel } from './vehicle-modification.model.js';

@Entity({
    name: 'vehicles',
})
export class VehicleModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('varchar', {
        unique: true,
    })
    vehicleNumber!: string;

    @Column('varchar')
    belongs!: string;

    @Column('date', { nullable: true })
    productionDate!: string | null;

    @Column('date', { nullable: true })
    scrappedDate!: string | null;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt!: Date;

    @OneToMany(
        () => VehicleFormationModel,
        (vehicleFormation) => vehicleFormation.vehicle,
        {
            cascade: true,
        },
    )
    vehicleFormations?: Relation<VehicleFormationModel[]>;

    @OneToMany(
        () => VehicleModificationModel,
        (modification) => modification.vehicle,
    )
    modifications?: Relation<VehicleModificationModel[]>;
}

import { VehicleModel } from 'src/libs/vehicle/infrastructure/models/vehicle.model';
import { Vehicle } from 'src/main/v1/vehicle/vehicle.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { FormationModel } from './formation.model';

@Entity({
    name: 'vehicle_formations',
})
export class VehicleFormationModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    formationId: string;

    @Column('uuid')
    vehicleId: string;

    @Column('smallint')
    carNumber: number;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt: Date;

    @ManyToOne(
        () => FormationModel,
        (formation) => formation.vehicleFormations,
        {
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({ name: 'formation_id' })
    readonly formation?: FormationModel;

    @ManyToOne(() => VehicleModel, (vehicle) => vehicle.vehicleFormations, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'vehicle_id' })
    readonly vehicle?: VehicleModel;
}

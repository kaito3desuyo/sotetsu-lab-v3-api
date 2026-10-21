import { VehicleModel } from '../../../vehicle/infrastructure/models/vehicle.model.js';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    type Relation,
} from 'typeorm';
import { FormationModel } from './formation.model.js';

@Entity({
    name: 'vehicle_formations',
})
export class VehicleFormationModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    @Index()
    formationId: string;

    @Column('uuid')
    @Index()
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
    readonly formation?: Relation<FormationModel>;

    @ManyToOne(() => VehicleModel, (vehicle) => vehicle.vehicleFormations, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'vehicle_id' })
    readonly vehicle?: Relation<VehicleModel>;
}

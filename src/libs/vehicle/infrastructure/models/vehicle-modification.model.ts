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
import { VehicleModel } from './vehicle.model.js';

/** 車両の改造の記録（塗り替え・リニューアルなど）。起きた日の出来事として 1 行ずつ持つ（docs/adr/0020-vehicle-modifications.md） */
@Entity({
    name: 'vehicle_modifications',
})
export class VehicleModificationModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    @Index()
    vehicleId!: string;

    /** 改造した日。null は「新製のときから」 */
    @Column('date', { nullable: true })
    modifiedOn!: string | null;

    /** 改造の種類。`livery`・`renewal`・`equipment`・`platform-door` など */
    @Column('varchar')
    kind!: string;

    /** 種類ごとの値。`livery` では塗装の値 */
    @Column('varchar', { nullable: true })
    value!: string | null;

    @Column('text', { nullable: true })
    description!: string | null;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt!: Date;

    @ManyToOne(() => VehicleModel, (vehicle) => vehicle.modifications, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'vehicle_id' })
    readonly vehicle?: Relation<VehicleModel>;
}

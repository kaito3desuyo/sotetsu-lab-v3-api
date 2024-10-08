import {
    Entity,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { TripModel } from '../../../trip/infrastructure/models/trip.model';

@Entity({
    name: 'trip_blocks',
})
export class TripBlockModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    readonly createdAt?: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    readonly updatedAt?: Date;

    @OneToMany(() => TripModel, (trip) => trip.tripBlock, { cascade: true })
    readonly trips?: TripModel[];
}

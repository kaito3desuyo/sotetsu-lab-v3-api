import {
    Entity,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    type Relation,
} from 'typeorm';
import { TripModel } from '../../../trip/infrastructure/models/trip.model.js';

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
    readonly trips?: Relation<TripModel[]>;
}

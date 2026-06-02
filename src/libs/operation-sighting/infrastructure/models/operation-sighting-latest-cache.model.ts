import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { OperationSightingModel } from './operation-sighting.model';

@Entity({ name: 'operation_sighting_latest_caches' })
@Index(['formationNumber'], { unique: true })
@Index(['operationNumber'])
@Index(['operationSightingId'])
export class OperationSightingLatestCacheModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'text' })
    formationNumber!: string;

    @Column({ type: 'text' })
    operationNumber!: string;

    @Column({ type: 'uuid' })
    operationSightingId!: string;

    @ManyToOne(() => OperationSightingModel)
    @JoinColumn({ name: 'operation_sighting_id' })
    readonly operationSighting?: OperationSightingModel;
}

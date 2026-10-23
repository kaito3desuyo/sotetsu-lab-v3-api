import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToOne,
    PrimaryColumn,
    UpdateDateColumn,
    type Relation,
} from 'typeorm';
import { AuthUserModel } from '../../../user/infrastructure/models/auth-user.model.js';
import { OperationSightingModel } from './operation-sighting.model.js';

/**
 * 目撃を投稿した利用者。2026-10-23 の登録制から記録する（それより前の目撃には行が無い）。
 * 目撃の本体には列を足さずにここへ分けた。投稿者名は画面に出さず、運営の調べ物にだけ使う。
 * user_id の索引は「この人の投稿」を引くため。
 */
@Entity({ name: 'operation_sighting_authors' })
export class OperationSightingAuthorModel {
    @PrimaryColumn('uuid')
    operationSightingId!: string;

    @OneToOne(() => OperationSightingModel, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'operation_sighting_id' })
    readonly operationSighting?: Relation<OperationSightingModel>;

    @Column('uuid')
    @Index()
    userId!: string;

    @ManyToOne(() => AuthUserModel)
    @JoinColumn({ name: 'user_id' })
    readonly authUser?: Relation<AuthUserModel>;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt?: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt?: Date;
}

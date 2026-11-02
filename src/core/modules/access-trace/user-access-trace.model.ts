import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    type Relation,
} from 'typeorm';
import { AuthUserModel } from '../../../libs/user/infrastructure/models/auth-user.model.js';
import { OperationSightingModel } from '../../../libs/operation-sighting/infrastructure/models/operation-sighting.model.js';

export type UserAccessTraceKind = 'post' | 'session';

/**
 * 同じ人が別アカウントを作っていないかを調べる手がかり（IP・端末）。90 日で消す。
 * 投稿のたび（post）と、ログインのセッションごと（session）に記録する。
 * 同じ IP を使ったアカウントを引くための表で、利用者本人には見せない。
 */
@Entity({ name: 'user_access_traces' })
@Index(['userId', 'createdAt'])
@Index(['ip'])
@Index(['createdAt'])
@Index(['sessionId', 'ip'], { unique: true })
export class UserAccessTraceModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    userId!: string;

    @ManyToOne(() => AuthUserModel, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    readonly authUser?: Relation<AuthUserModel>;

    @Column('text')
    kind!: UserAccessTraceKind;

    @Column('inet')
    ip!: string;

    @Column('text', { nullable: true })
    userAgent!: string | null;

    /** session のときだけ入る。post は NULL（NULL は一意索引で衝突しない） */
    @Column('uuid', { nullable: true })
    sessionId!: string | null;

    @Column('uuid', { nullable: true })
    operationSightingId!: string | null;

    @ManyToOne(() => OperationSightingModel, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'operation_sighting_id' })
    readonly operationSighting?: Relation<OperationSightingModel>;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt?: Date;
}

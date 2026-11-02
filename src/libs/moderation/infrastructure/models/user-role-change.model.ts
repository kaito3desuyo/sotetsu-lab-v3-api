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
import { AuthUserModel } from '../../../user/infrastructure/models/auth-user.model.js';

/**
 * 役割の書き換えの記録（BAN・解除）。BAN の解除は、直近の BAN（to_role = viewer）の from_role に戻す。
 * 利用者が消えたら記録も消す。changed_by は消さない（MANAGER を消すなら記録を先に片付ける）。
 */
@Entity({ name: 'user_role_changes' })
@Index(['userId', 'createdAt'])
export class UserRoleChangeModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    userId!: string;

    @ManyToOne(() => AuthUserModel, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    readonly authUser?: Relation<AuthUserModel>;

    @Column('uuid')
    changedBy!: string;

    @ManyToOne(() => AuthUserModel)
    @JoinColumn({ name: 'changed_by' })
    readonly changedByAuthUser?: Relation<AuthUserModel>;

    @Column('text')
    fromRole!: string;

    @Column('text')
    toRole!: string;

    @Column('text', { nullable: true })
    reason!: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt?: Date;
}

import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryColumn,
    UpdateDateColumn,
    Relation,
} from 'typeorm';
import { AuthUserModel } from './auth-user.model';

/**
 * 利用者の表示名と役割。利用者そのもの（パスワード・セッション）は Supabase Auth の auth.users が持つ。
 * user_id は auth.users(id) への外部キー。モデルにも書いておかないと migration:generate がこの外部キーを消す差分を出す。
 * role は Custom Access Token Hook が JWT の user_role に入れる。
 */
@Entity({ name: 'profiles' })
export class ProfileModel {
    @PrimaryColumn('uuid')
    userId: string;

    @OneToOne(() => AuthUserModel, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    authUser?: Relation<AuthUserModel>;

    /** ログインに使う名前を小文字にしたもの。ダミーのメールアドレスの前半と同じ */
    @Column('text', { unique: true })
    username: string;

    /** 元の書き方のユーザー名 */
    @Column('text')
    displayName: string;

    @Column('text')
    role: string;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}

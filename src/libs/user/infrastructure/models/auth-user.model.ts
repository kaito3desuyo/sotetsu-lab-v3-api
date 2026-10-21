import { Entity, PrimaryColumn } from 'typeorm';

/**
 * Supabase Auth が持つ auth.users を、profiles からの外部キーの参照先として映すだけのモデル。
 * 表は Supabase が管理するので synchronize: false にし、TypeORM には作らせも変えさせもしない。
 * 主キーの id だけを持つ（Supabase が変わらないと保証しているのは主キーだけ）。
 */
@Entity({ schema: 'auth', name: 'users', synchronize: false })
export class AuthUserModel {
    @PrimaryColumn('uuid')
    id!: string;
}

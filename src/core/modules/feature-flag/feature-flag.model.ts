import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * 機能の切り替え。行が無いキーは off として扱う。
 * 切り替えはデプロイでなく SQL（insert … on conflict）で行う。
 */
@Entity({ name: 'feature_flags' })
export class FeatureFlagModel {
    @PrimaryColumn('text')
    key!: string;

    @Column('boolean', { default: false })
    enabled!: boolean;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;
}

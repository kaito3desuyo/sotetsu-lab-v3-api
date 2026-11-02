import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileModel } from '../../../libs/user/infrastructure/models/profile.model.js';
import { isRole, Role } from './role.enum.js';

/**
 * profiles.role をその場で読む。JWT の役割は発行から最大 1 時間古いので、BAN・昇格を即座に効かせるために使う。
 * キャッシュしない。
 */
@Injectable()
export class CurrentRoles {
    constructor(
        @InjectRepository(ProfileModel)
        private readonly repository: Repository<ProfileModel>,
    ) {}

    /** 行が無い・知らない役割なら null */
    async findRole(userId: string): Promise<Role | null> {
        const row = await this.repository
            .createQueryBuilder('p')
            .select('p.role', 'role')
            .where('p.userId = :userId', { userId })
            .getRawOne<{ role: string }>();
        return isRole(row?.role) ? row.role : null;
    }
}

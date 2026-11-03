import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileModel } from '../models/profile.model.js';

@Injectable()
export class UserRoleQuery {
    constructor(
        @InjectRepository(ProfileModel)
        private readonly repository: Repository<ProfileModel>,
    ) {}

    /** profiles.role の生の文字列。行が無ければ null */
    async findRoleValue(userId: string): Promise<string | null> {
        const row = await this.repository
            .createQueryBuilder('p')
            .select('p.role', 'role')
            .where('p.userId = :userId', { userId })
            .getRawOne<{ role: string }>();
        return row?.role ?? null;
    }
}

import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { UserRoleChange } from '../domain/user-role-change.domain.js';
import { UserRoleChangeCommand } from '../infrastructure/command/user-role-change.command.js';

@Injectable()
export class UserRoleChangeService {
    constructor(private readonly command: UserRoleChangeCommand) {}

    /** profiles.role の更新と役割の変更の記録を 1 件書く。呼び出し側のトランザクションの中で流す */
    async apply(change: UserRoleChange, manager: EntityManager): Promise<void> {
        await this.command.apply(change, manager);
    }
}

import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileModel } from '../../../libs/user/infrastructure/models/profile.model.js';
import { CurrentRoles } from './current-roles.js';

/** RBACGuard が各 controller の module で作られるため、どこからでも CurrentRoles を引けるよう Global にする */
@Global()
@Module({
    imports: [TypeOrmModule.forFeature([ProfileModel])],
    providers: [CurrentRoles],
    exports: [CurrentRoles],
})
export class CurrentRoleModule {}

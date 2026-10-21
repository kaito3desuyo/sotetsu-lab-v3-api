import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../core/modules/auth/auth.module.js';
import { AgencyModel } from './infrastructure/models/agency.model.js';
import { AgencyQuery } from './infrastructure/queries/agency.query.js';

@Module({
    imports: [TypeOrmModule.forFeature([AgencyModel]), AuthModule],
    exports: [AgencyQuery],
    providers: [AgencyQuery],
})
export class AgencyLibsModule {}

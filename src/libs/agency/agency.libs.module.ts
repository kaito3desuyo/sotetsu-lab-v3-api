import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/modules/auth/auth.module';
import { AgencyModel } from './infrastructure/models/agency.model';
import { AgencyQuery } from './infrastructure/queries/agency.query';

@Module({
    imports: [TypeOrmModule.forFeature([AgencyModel]), AuthModule],
    exports: [AgencyQuery],
    providers: [AgencyQuery],
})
export class AgencyLibsModule {}

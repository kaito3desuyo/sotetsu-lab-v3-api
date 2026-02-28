import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/modules/auth/auth.module';
import { ServiceModel } from './infrastructure/models/service.model';
import { ServiceQuery } from './infrastructure/queries/service.query';

@Module({
    imports: [TypeOrmModule.forFeature([ServiceModel])],
    exports: [ServiceQuery],
    providers: [ServiceQuery],
})
export class ServiceLibsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceModel } from './infrastructure/models/service.model.js';
import { ServiceQuery } from './infrastructure/queries/service.query.js';

@Module({
    imports: [TypeOrmModule.forFeature([ServiceModel])],
    exports: [ServiceQuery],
    providers: [ServiceQuery],
})
export class ServiceLibsModule {}

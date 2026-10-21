import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../core/modules/auth/auth.module.js';
import { RouteModel } from './infrastructure/models/route.model.js';
import { RouteQuery } from './infrastructure/queries/route.query.js';

@Module({
    imports: [TypeOrmModule.forFeature([RouteModel]), AuthModule],
    exports: [RouteQuery],
    providers: [RouteQuery],
})
export class RouteLibsModule {}

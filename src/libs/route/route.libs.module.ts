import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/auth/auth.module';
import { RouteModel } from './infrastructure/models/route.model';
import { RouteQuery } from './infrastructure/queries/route.query';

@Module({
    imports: [TypeOrmModule.forFeature([RouteModel]), AuthModule],
    exports: [RouteQuery],
    providers: [RouteQuery],
})
export class RouteLibsModule {}

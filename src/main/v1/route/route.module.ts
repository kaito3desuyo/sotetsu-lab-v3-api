import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/auth/auth.module';
import { RouteController } from './route.controller';
import { Route } from './route.entity';
import { RouteService } from './route.service';

@Module({
    imports: [TypeOrmModule.forFeature([Route]), AuthModule],
    controllers: [RouteController],
    providers: [RouteService],
})
export class RouteModule {}

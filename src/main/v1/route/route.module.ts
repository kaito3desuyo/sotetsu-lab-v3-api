import { Module } from '@nestjs/common';
import { RouteController } from './route.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Route } from './route.entity';
import { RouteService } from './route.service';
import { AuthService } from './../../../shared/services/auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([Route])],
  controllers: [RouteController],
  providers: [RouteService, AuthService],
})
export class RouteModule {}

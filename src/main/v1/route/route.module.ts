import { Module } from '@nestjs/common';
import { RouteController } from './route.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Route } from './route.entity';
import { RouteService } from './route.service';

@Module({
  imports: [TypeOrmModule.forFeature([Route])],
  controllers: [RouteController],
  providers: [RouteService],
})
export class RouteModule {}

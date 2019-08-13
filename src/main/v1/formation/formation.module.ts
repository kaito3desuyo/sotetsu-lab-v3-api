import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Formation } from './formation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Formation])],
  controllers: [],
  providers: [],
})
export class FormationModule {}

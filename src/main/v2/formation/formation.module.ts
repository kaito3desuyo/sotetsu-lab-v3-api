import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Formation } from '../../../main/v1/formation/formation.entity';
import { FormationService } from './formation.service';
import { FormationController } from './formation.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Formation])],
  controllers: [FormationController],
  providers: [FormationService],
})
export class FormationV2Module {}

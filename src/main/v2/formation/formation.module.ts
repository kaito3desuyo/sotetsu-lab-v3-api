import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/auth/auth.module';
import { Formation } from '../../../main/v1/formation/formation.entity';
import { FormationController } from './formation.controller';
import { FormationService } from './formation.service';

@Module({
    imports: [TypeOrmModule.forFeature([Formation]), AuthModule],
    controllers: [FormationController],
    providers: [FormationService],
})
export class FormationV2Module {}

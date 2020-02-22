import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Formation } from '../../../main/v1/formation/formation.entity';
import { FormationService } from './formation.service';
import { FormationController } from './formation.controller';
import { AuthService } from '../../../shared/services/auth.service';

@Module({
    imports: [TypeOrmModule.forFeature([Formation])],
    controllers: [FormationController],
    providers: [FormationService, AuthService],
})
export class FormationV2Module {}

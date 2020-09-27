import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/auth/auth.module';
import { OperationSighting } from '../operation/operation-sighting.entity';
import { OperationSightingService } from '../operation/operation-sightings.service';
import { FormationController } from './formation.controller';
import { Formation } from './formation.entity';
import { FormationService } from './formation.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Formation, OperationSighting]),
        AuthModule,
    ],
    controllers: [FormationController],
    providers: [FormationService, OperationSightingService],
})
export class FormationModule {}

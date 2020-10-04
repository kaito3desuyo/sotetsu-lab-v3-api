import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/auth/auth.module';
import { OperationSighting } from '../operation/operation-sighting.entity';
import { OperationSightingService } from '../operation/operation-sightings.service';
import { Operation } from '../operation/operation.entity';
import { OperationService } from '../operation/operation.service';
import { OperationSightingController } from './operation-sighting.controller';
import { NewOperationSightingService } from './operation-sighting.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Operation, OperationSighting]),
        AuthModule,
    ],
    controllers: [OperationSightingController],
    providers: [
        OperationService,
        OperationSightingService,
        NewOperationSightingService,
    ],
})
export class OperationSightingModule {}

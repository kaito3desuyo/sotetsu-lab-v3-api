import { Module } from '@nestjs/common';
import { AuthModule } from 'src/core/modules/auth/auth.module';
import { FormationLibsModule } from '../formation/formation.libs.module';
import { OperationLibsModule } from '../operation/operation.libs.module';
import { OperationSightingLibsModule } from './operation-sighting.libs.module';
import { OperationSightingV3Controller } from './presentation/operation-sighting.v3.controller';
import { OperationSightingV3Service } from './usecase/operation-sighting.v3.service';
import { CalendarLibsModule } from '../calendar/calendar.libs.module';

@Module({
    imports: [
        OperationSightingLibsModule,
        CalendarLibsModule,
        OperationLibsModule,
        FormationLibsModule,
    ],
    controllers: [OperationSightingV3Controller],
    providers: [OperationSightingV3Service],
})
export class OperationSightingV3Module {}

import { Module } from '@nestjs/common';
import { CdnInvalidationModule } from '../../core/modules/cdn-invalidation/cdn-invalidation.module.js';
import { SocketSignalModule } from '../../core/modules/socket-signal/socket-signal.module.js';
import { FormationLibsModule } from '../formation/formation.libs.module.js';
import { OperationLibsModule } from '../operation/operation.libs.module.js';
import { OperationSightingLibsModule } from './operation-sighting.libs.module.js';
import { OperationSightingV3Controller } from './presentation/operation-sighting.v3.controller.js';
import { OperationSightingV3ListService } from './usecase/operation-sighting.v3.list.service.js';
import { OperationSightingV3Service } from './usecase/operation-sighting.v3.service.js';
import { OperationSightingV3TimeCrossSectionService } from './usecase/operation-sighting.v3.time-cross-section.service.js';
import { CalendarLibsModule } from '../calendar/calendar.libs.module.js';

@Module({
    imports: [
        OperationSightingLibsModule,
        CalendarLibsModule,
        OperationLibsModule,
        FormationLibsModule,
        SocketSignalModule,
        CdnInvalidationModule,
    ],
    controllers: [OperationSightingV3Controller],
    providers: [
        OperationSightingV3ListService,
        OperationSightingV3TimeCrossSectionService,
        OperationSightingV3Service,
    ],
    exports: [OperationSightingV3ListService],
})
export class OperationSightingV3Module {}

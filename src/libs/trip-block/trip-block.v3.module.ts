import { Module } from '@nestjs/common';
import { SocketSignalModule } from '../../core/modules/socket-signal/socket-signal.module.js';
import { OperationLibsModule } from '../operation/operation.libs.module.js';
import { TripBlockLibsModule } from './trip-block.libs.module.js';
import { TripBlockV3Controller } from './presentation/trip-block.v3.controller.js';
import { TripBlockV3Service } from './usecase/trip-block.v3.service.js';

@Module({
    imports: [TripBlockLibsModule, OperationLibsModule, SocketSignalModule],
    controllers: [TripBlockV3Controller],
    providers: [TripBlockV3Service],
})
export class TripBlockV3Module {}

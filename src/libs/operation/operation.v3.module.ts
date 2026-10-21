import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/modules/auth/auth.module.js';
import { OperationLibsModule } from './operation.libs.module.js';
import { OperationV3Controller } from './presentation/operation.v3.controller.js';
import { OperationV3Service } from './usecase/operation.v3.service.js';

@Module({
    imports: [AuthModule, OperationLibsModule],
    controllers: [OperationV3Controller],
    providers: [OperationV3Service],
})
export class OperationV3Module {}

import { Module } from '@nestjs/common';
import { OperationSightingV3Module } from '../operation-sighting/operation-sighting.v3.module.js';
import { UserV3Controller } from './presentation/user.v3.controller.js';
import { UserV3Service } from './usecase/user.v3.service.js';

@Module({
    imports: [OperationSightingV3Module],
    controllers: [UserV3Controller],
    providers: [UserV3Service],
})
export class UserV3Module {}

import { Module } from '@nestjs/common';
import { ServiceV3Controller } from './presentation/service.v3.controller.js';
import { ServiceLibsModule } from './service.libs.module.js';
import { ServiceV3Service } from './usecase/service.v3.service.js';

@Module({
    imports: [ServiceLibsModule],
    controllers: [ServiceV3Controller],
    providers: [ServiceV3Service],
})
export class ServiceV3Module {}

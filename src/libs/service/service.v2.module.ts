import { Module } from '@nestjs/common';
import { ServiceV2Controller } from './presentation/service.v2.controller';

@Module({
    controllers: [ServiceV2Controller],
    providers: [],
})
export class ServiceV2Module {}

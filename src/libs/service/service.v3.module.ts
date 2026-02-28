import { Module } from '@nestjs/common';
import { ServiceV3Controller } from './presentation/service.v3.controller';
import { ServiceLibsModule } from './service.libs.module';
import { ServiceV3Service } from './usecase/service.v3.service';

@Module({
    imports: [ServiceLibsModule],
    controllers: [ServiceV3Controller],
    providers: [ServiceV3Service],
})
export class ServiceV3Module {}

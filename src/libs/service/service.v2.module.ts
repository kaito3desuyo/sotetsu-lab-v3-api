import { Module } from '@nestjs/common';
import { ServiceV2Controller } from './presentation/service.v2.controller';
import { ServiceLibsModule } from './service.libs.module';
import { ServiceV2Service } from './usecase/service.v2.service';

@Module({
    imports: [ServiceLibsModule],
    controllers: [ServiceV2Controller],
    providers: [ServiceV2Service],
})
export class ServiceV2Module {}

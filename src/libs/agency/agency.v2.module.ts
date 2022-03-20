import { Module } from '@nestjs/common';
import { AgencyLibsModule } from './agency.libs.module';
import { AgencyV2Controller } from './presentation/agency.v2.controller';
import { AgencyV2Service } from './usecase/agency.v2.service';

@Module({
    imports: [AgencyLibsModule],
    controllers: [AgencyV2Controller],
    providers: [AgencyV2Service],
})
export class AgencyV2Module {}

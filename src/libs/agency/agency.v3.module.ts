import { Module } from '@nestjs/common';
import { AgencyLibsModule } from './agency.libs.module';
import { AgencyV3Controller } from './presentation/agency.v3.controller';
import { AgencyV3Service } from './usecase/agency.v3.service';

@Module({
    imports: [AgencyLibsModule],
    controllers: [AgencyV3Controller],
    providers: [AgencyV3Service],
})
export class AgencyV3Module {}

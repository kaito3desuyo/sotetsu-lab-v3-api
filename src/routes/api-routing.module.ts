import { Module } from '@nestjs/common';
import { ApiV2Module } from './api/v2/apiv2.module';
import { ApiV3Module } from './api/v3/api-v3.module';

@Module({
    imports: [ApiV2Module, ApiV3Module],
})
export class ApiRoutingModule {}

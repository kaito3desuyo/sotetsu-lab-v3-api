import { Module } from '@nestjs/common';
import { ApiV2Module } from './api/v2/apiv2.module';

@Module({
    imports: [ApiV2Module],
})
export class ApiRoutingModule {}

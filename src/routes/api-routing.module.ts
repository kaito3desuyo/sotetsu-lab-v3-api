import { Module } from '@nestjs/common';
import { ApiV3Module } from './api/v3/api-v3.module';

@Module({
    imports: [ApiV3Module],
})
export class ApiRoutingModule {}

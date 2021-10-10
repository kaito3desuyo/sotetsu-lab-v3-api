import { Module } from '@nestjs/common';
import { AuthModule } from 'src/core/auth/auth.module';
import { OperationSightingLibsModule } from './operation-sighting.libs.module';
import { OperationSightingV2Service } from './usecase/operation-sighting.v2.service';

@Module({
    imports: [AuthModule, OperationSightingLibsModule],
    controllers: [],
    providers: [OperationSightingV2Service],
})
export class OperationSightingV2Module {}

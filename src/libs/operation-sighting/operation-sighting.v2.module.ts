import { Module } from '@nestjs/common';
import { AuthModule } from 'src/core/modules/auth/auth.module';
import { OperationSightingLibsModule } from './operation-sighting.libs.module';
import { OperationSightingV2Controller } from './presentation/operation-sighting.v2.controller';
import { OperationSightingV2Service } from './usecase/operation-sighting.v2.service';

@Module({
    imports: [AuthModule, OperationSightingLibsModule],
    controllers: [OperationSightingV2Controller],
    providers: [OperationSightingV2Service],
})
export class OperationSightingV2Module {}

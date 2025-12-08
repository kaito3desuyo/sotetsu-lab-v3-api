import { Module } from '@nestjs/common';
import { AuthModule } from 'src/core/modules/auth/auth.module';
import { OperationSightingLibsModule } from './operation-sighting.libs.module';
import { OperationSightingV3Controller } from './presentation/operation-sighting.v3.controller';
import { OperationSightingV3Service } from './usecase/operation-sighting.v3.service';

@Module({
    imports: [AuthModule, OperationSightingLibsModule],
    controllers: [OperationSightingV3Controller],
    providers: [OperationSightingV3Service],
})
export class OperationSightingV3Module {}

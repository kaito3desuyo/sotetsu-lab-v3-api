import { Module } from '@nestjs/common';
import { AuthModule } from 'src/core/auth/auth.module';
import { OperationSightingLibsModule } from '../../../libs/operation-sighting/operation-sighting.libs.module';
import { OperationSightingV2Controller } from './operation-sighting.v2.controller';

@Module({
    imports: [AuthModule, OperationSightingLibsModule],
    controllers: [OperationSightingV2Controller],
})
export class OperationSightingV2Module {}

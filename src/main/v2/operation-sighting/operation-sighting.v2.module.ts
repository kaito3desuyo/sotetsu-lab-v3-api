import { Module } from '@nestjs/common';
import { OperationSightingV2Controller } from './operation-sighting.v2.controller';
import { OperationSightingLibsModule } from '../../../libs/operation-sighting/operation-sighting.libs.module';
import { AuthService } from '../../../shared/services/auth.service';

@Module({
    imports: [OperationSightingLibsModule],
    controllers: [OperationSightingV2Controller],
    providers: [AuthService],
})
export class OperationSightingV2Module {}

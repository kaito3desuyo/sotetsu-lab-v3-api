import { Module } from '@nestjs/common';
import { OperationSightingV2Controller } from './operation-sighting.v2.controller';
import { OperationSightingLibsModule } from '../../../libs/operation-sighting/operation-sighting.libs.module';

@Module({
    imports: [OperationSightingLibsModule],
    controllers: [OperationSightingV2Controller],
    providers: [],
})
export class OperationSightingV2Module {}

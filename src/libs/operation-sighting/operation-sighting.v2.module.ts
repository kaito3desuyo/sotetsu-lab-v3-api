import { Module } from '@nestjs/common';
import { AuthModule } from 'src/core/auth/auth.module';
import { OperationSightingLibsModule } from './operation-sighting.libs.module';

@Module({
    imports: [AuthModule, OperationSightingLibsModule],
    controllers: [],
    providers: [],
})
export class OperationSightingV2Module {}

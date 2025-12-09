import { Module } from '@nestjs/common';
import { AuthModule } from 'src/core/modules/auth/auth.module';
import { OperationLibsModule } from './operation.libs.module';
import { OperationV3Controller } from './presentation/operation.v3.controller';
import { OperationV3Service } from './usecase/operation.v3.service';

@Module({
    imports: [AuthModule, OperationLibsModule],
    controllers: [OperationV3Controller],
    providers: [OperationV3Service],
})
export class OperationV3Module {}

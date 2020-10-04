import { Module } from '@nestjs/common';
import { AuthModule } from 'src/core/auth/auth.module';
import { OperationLibsModule } from '../../../libs/operation/operation.libs.module';
import { OperationV2Controller } from './operation.v2.controller';

@Module({
    imports: [AuthModule, OperationLibsModule],
    controllers: [OperationV2Controller],
})
export class OperationV2Module {}

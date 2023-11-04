import { Module } from '@nestjs/common';
import { AuthModule } from 'src/core/modules/auth/auth.module';
import { OperationLibsModule } from './operation.libs.module';
import { OperationV2Controller } from './presentation/operation.v2.controller';
import { OperationV2Service } from './usecase/operation.v2.service';

@Module({
    imports: [AuthModule, OperationLibsModule],
    controllers: [OperationV2Controller],
    providers: [OperationV2Service],
})
export class OperationV2Module {}

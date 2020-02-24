import { Module } from '@nestjs/common';
import { OperationV2Controller } from './operation.v2.controller';
import { AuthService } from '../../../shared/services/auth.service';
import { OperationLibsModule } from '../../../libs/operation/operation.libs.module';

@Module({
    imports: [OperationLibsModule],
    controllers: [OperationV2Controller],
    providers: [AuthService],
})
export class OperationV2Module {}

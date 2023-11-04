import { Module } from '@nestjs/common';
import { AuthModule } from 'src/core/auth/auth.module';
import { ApiV2Module } from './v2/apiv2.module';

@Module({
    imports: [AuthModule, ApiV2Module],
})
export class MainModule {}

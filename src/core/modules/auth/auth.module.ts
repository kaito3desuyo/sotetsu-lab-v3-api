import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

@Module({
    providers: [AuthGuard],
})
export class AuthModule {}

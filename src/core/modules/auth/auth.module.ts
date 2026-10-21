import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';

@Module({
    providers: [AuthGuard],
})
export class AuthModule {}

import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthGuard } from './auth.guard';
import { JwtStrategy } from './jwt.strategy';

@Module({
    imports: [PassportModule],
    providers: [AuthGuard, JwtStrategy],
})
export class AuthModule {}

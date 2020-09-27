import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/auth/auth.module';
import { TimeController } from './time.controller';
import { Time } from './time.entity';
import { TimeService } from './time.service';

@Module({
    imports: [TypeOrmModule.forFeature([Time]), AuthModule],
    controllers: [TimeController],
    providers: [TimeService],
})
export class TimeModule {}

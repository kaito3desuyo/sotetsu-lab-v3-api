import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Time } from './time.entity';
import { TimeService } from './time.service';
import { TimeController } from './time.controller';
import { AuthService } from '../../../shared/services/auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([Time])],
  controllers: [TimeController],
  providers: [TimeService, AuthService],
})
export class TimeModule {}

import { Module, HttpModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Calender } from './calender.entity';
import { CalenderController } from './calender.controller';
import { CalenderService } from './calender.service';

@Module({
  imports: [TypeOrmModule.forFeature([Calender]), HttpModule],
  controllers: [CalenderController],
  providers: [CalenderService],
})
export class CalenderModule {}

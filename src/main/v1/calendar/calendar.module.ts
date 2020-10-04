import { Module, HttpModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Calendar } from './calendar.entity';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { AuthModule } from 'src/core/auth/auth.module';

@Module({
    imports: [TypeOrmModule.forFeature([Calendar]), HttpModule, AuthModule],
    controllers: [CalendarController],
    providers: [CalendarService],
})
export class CalendarModule {}

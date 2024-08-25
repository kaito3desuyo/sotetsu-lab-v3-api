import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { LoggerConfig } from 'src/core/configs/logger.config';
import { LoggerService } from './logger.service';

@Module({
    imports: [
        PinoLoggerModule.forRoot({
            pinoHttp: LoggerConfig[process.env.NODE_ENV || 'development'],
        }),
    ],
    exports: [LoggerService],
    providers: [LoggerService],
})
export class LoggerModule {}

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
// import compression from 'compression';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { validationPipeOptions } from './core/configs/validator-options';
import { LoggerService } from './core/modules/logger/logger.service';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Tokyo');

export async function createApp(): Promise<INestApplication> {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(), {
        bufferLogs: true,
    });

    app.enableShutdownHooks();
    // app.use(compression());
    app.use(helmet());
    app.enableCors({
        origin: process.env.CORS_HEADER_ORIGIN || '*',
    });
    app.useLogger(app.get(LoggerService));
    app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
    // app.useGlobalFilters(new ErrorFilter());
    // app.useGlobalFilters(new HttpExceptionFilter());

    return app;
}

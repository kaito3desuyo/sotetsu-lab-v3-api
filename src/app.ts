import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
// import compression from 'compression';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { validationPipeOptions } from './core/configs/validator-options';
import { UnexpectedErrorFilter } from './core/filters/unexpected-error.filter';
import { UseCaseErrorFilter } from './core/filters/usecase-error.filter';
import { LoggerService } from './core/modules/logger/logger.service';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
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
    app.useGlobalFilters(new UnexpectedErrorFilter());
    app.useGlobalFilters(new UseCaseErrorFilter());

    return app;
}

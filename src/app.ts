import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
    ExpressAdapter,
    NestExpressApplication,
} from '@nestjs/platform-express';
// import compression from 'compression';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { corsOptions } from './core/configs/cors-options.js';
import { configureExpress } from './core/configs/express-settings.js';
import { validationPipeOptions } from './core/configs/validator-options.js';
import { UnexpectedErrorFilter } from './core/filters/unexpected-error.filter.js';
import { UseCaseErrorFilter } from './core/filters/usecase-error.filter.js';
import { LoggerService } from './core/modules/logger/logger.service.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.tz.setDefault('Asia/Tokyo');

export async function createApp(): Promise<INestApplication> {
    const app = await NestFactory.create<NestExpressApplication>(
        AppModule,
        new ExpressAdapter(),
        {
            bufferLogs: true,
        },
    );

    configureExpress(app);
    app.enableShutdownHooks();
    // app.use(compression());
    app.use(helmet());
    app.enableCors(corsOptions(process.env.CORS_HEADER_ORIGIN));
    app.useLogger(app.get(LoggerService));
    app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
    // app.useGlobalFilters(new ErrorFilter());
    // app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalFilters(new UnexpectedErrorFilter());
    app.useGlobalFilters(new UseCaseErrorFilter());

    return app;
}

import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
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
import {
    assertTargetsAgree,
    type DatabaseTarget,
    describeDatabaseTarget,
    isOnLambda,
    resolveDatabaseTarget,
} from './core/configs/database-target.js';
import { configureExpress } from './core/configs/express-settings.js';
import { validationPipeOptions } from './core/configs/validator-options.js';
import { UnexpectedErrorFilter } from './core/filters/unexpected-error.filter.js';
import { UseCaseErrorFilter } from './core/filters/usecase-error.filter.js';
import { LoggerService } from './core/modules/logger/logger.service.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.tz.setDefault('Asia/Tokyo');

function resolveTarget(): DatabaseTarget | undefined {
    if (isOnLambda(process.env)) {
        try {
            return resolveDatabaseTarget(process.env);
        } catch {
            return undefined;
        }
    }
    const target = resolveDatabaseTarget(process.env);
    assertTargetsAgree(target);
    return target;
}

export async function createApp(): Promise<INestApplication> {
    // 接続先を決めてから Nest を立てる。Lambda（本番の通常運用）では判定できなくても止めない
    const target = resolveTarget();

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
    if (target) {
        const targetMessage = describeDatabaseTarget(target);
        if (target.db === 'production' || target.auth === 'production') {
            Logger.warn(targetMessage, 'DatabaseTarget');
        } else {
            Logger.log(targetMessage, 'DatabaseTarget');
        }
    }
    app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
    // app.useGlobalFilters(new ErrorFilter());
    // app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalFilters(new UnexpectedErrorFilter());
    app.useGlobalFilters(new UseCaseErrorFilter());

    return app;
}

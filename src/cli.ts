/// <reference path="./core/types/express.d.ts" />
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { CommandFactory } from 'nest-commander';
import { CliModule } from './cli.module';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.tz.setDefault('Asia/Tokyo');

async function bootstrap(): Promise<void> {
    await CommandFactory.run(CliModule, [
        'log',
        'error',
        'warn',
        'debug',
        'verbose',
    ]);
}
bootstrap();

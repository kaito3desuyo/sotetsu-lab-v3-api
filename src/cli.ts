import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import { CommandFactory } from 'nest-commander';
import {
    assertNotProdOutsideLambda,
    describeDatabaseTarget,
    resolveDatabaseTarget,
} from './core/configs/database-target.js';
import { CliModule } from './cli.module.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.tz.setDefault('Asia/Tokyo');

async function bootstrap(): Promise<void> {
    // 手元から本番の DB につながない。つなぐ前（Nest を立てる前）に止める
    try {
        assertNotProdOutsideLambda(process.env);
    } catch (e) {
        console.error(e instanceof Error ? e.message : String(e));
        process.exitCode = 1;
        return;
    }
    try {
        console.warn(
            describeDatabaseTarget(resolveDatabaseTarget(process.env)),
        );
    } catch (e) {
        console.warn(e instanceof Error ? e.message : String(e));
    }
    await CommandFactory.run(CliModule, [
        'log',
        'error',
        'warn',
        'debug',
        'verbose',
    ]);
}
bootstrap();

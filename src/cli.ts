import { CommandFactory } from 'nest-commander';
import { CliModule } from './cli.module';

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

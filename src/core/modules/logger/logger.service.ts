import { Inject, Injectable } from '@nestjs/common';
import { Logger, Params, PARAMS_PROVIDER_TOKEN, PinoLogger } from 'nestjs-pino';

@Injectable()
export class LoggerService extends Logger {
    static contextsToIgnore = [
        'InstanceLoader',
        'RoutesResolver',
        'RouterExplorer',
        // 'NestFactory',
    ];

    constructor(
        logger: PinoLogger,
        @Inject(PARAMS_PROVIDER_TOKEN) params: Params,
    ) {
        super(logger, params);
    }

    override log(message: any, ...optionalParams: any[]): void {
        if (LoggerService.contextsToIgnore.includes(optionalParams.at(-1))) {
            return;
        }

        super.log(message, ...optionalParams);
    }
}

import pino from 'pino';
import { Options } from 'pino-http';

const baseConfig: Options = {
    messageKey: 'message',
    errorKey: 'error',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level: (label: string) => {
            return {
                level: label,
            };
        },
    },
    redact: [
        'req.headers["x-amz-security-token"]',
        'req.headers["x-sotetsu-lab-authorization"]',
    ],
};

export const LoggerConfig: Record<string, Options> = {
    production: {
        ...baseConfig,
        level: 'info',
    },
    development: {
        ...baseConfig,
        level: 'debug',
        transport: {
            target: 'pino-pretty',
        },
    },
};

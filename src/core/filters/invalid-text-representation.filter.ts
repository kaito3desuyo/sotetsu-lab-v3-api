import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

/** PostgreSQL の invalid_text_representation（UUID の形でない値など） */
const INVALID_TEXT_REPRESENTATION = '22P02';

function getDriverErrorCode(exception: QueryFailedError): string | undefined {
    const driverError: unknown = exception.driverError;
    if (
        typeof driverError === 'object' &&
        driverError !== null &&
        'code' in driverError &&
        typeof driverError.code === 'string'
    ) {
        return driverError.code;
    }
    return undefined;
}

@Catch(QueryFailedError)
export class InvalidTextRepresentationFilter implements ExceptionFilter {
    readonly #logger = new Logger();

    catch(exception: QueryFailedError, host: ArgumentsHost): void {
        const response = host.switchToHttp().getResponse<Response>();

        if (getDriverErrorCode(exception) === INVALID_TEXT_REPRESENTATION) {
            const status = HttpStatus.BAD_REQUEST;
            this.#logger.warn(exception.message);
            response.status(status).json({
                statusCode: status,
                message: '入力の形が正しくありません',
            });
            return;
        }

        const status = HttpStatus.INTERNAL_SERVER_ERROR;
        this.#logger.error(exception.message, exception.stack);
        response.status(status).json({
            statusCode: status,
            message: 'Internal server error',
        });
    }
}

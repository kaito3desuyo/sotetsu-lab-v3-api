import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { UseCaseError } from '../classes/custom-error';

@Catch(UseCaseError)
export class UseCaseErrorFilter implements ExceptionFilter {
    readonly #logger = new Logger();

    catch(exception: UseCaseError, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const status = HttpStatus.UNPROCESSABLE_ENTITY;

        this.#logger.error(exception.message, exception.stack, {
            name: exception.name,
            ...exception.context,
        });

        response.status(status).json({
            message: exception.message,
            statusCode: status,
        });
    }
}

import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { UnexpectedError } from '../classes/unexpected-error';

@Catch(UnexpectedError)
export class UnexpectedErrorFilter implements ExceptionFilter {
    readonly #logger = new Logger();

    catch(exception: UnexpectedError, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const status = HttpStatus.INTERNAL_SERVER_ERROR;

        this.#logger.fatal(exception.message, exception.stack, {
            name: exception.name,
            ...exception.context,
        });

        response.status(status).json({
            message: '予期しないエラーが発生しました',
            statusCode: status,
        });
    }
}

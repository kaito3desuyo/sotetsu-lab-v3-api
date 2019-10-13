import {
  Catch,
  HttpException,
  ExceptionFilter,
  ArgumentsHost,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    if (typeof exception.message === 'string') {
      response.status(status).json({
        errors: {
          statusCode: status,
          message: exception.message,
        },
      });
    } else {
      response.status(status).json({
        errors: {
          ...exception.message,
        },
      });
    }
  }
}

import { ArgumentsHost, Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { InvalidTextRepresentationFilter } from './invalid-text-representation.filter.js';

function createHost() {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
        switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    return { host, status, json };
}

function createError(code: string): QueryFailedError {
    const driverError = Object.assign(new Error('driver'), { code });
    return new QueryFailedError('SELECT 1', [], driverError);
}

describe('InvalidTextRepresentationFilter', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('22P02 は 400 で返し、warn で記録する', () => {
        const warn = vi
            .spyOn(Logger.prototype, 'warn')
            .mockImplementation(() => {});
        const error = vi
            .spyOn(Logger.prototype, 'error')
            .mockImplementation(() => {});
        const { host, status, json } = createHost();

        new InvalidTextRepresentationFilter().catch(createError('22P02'), host);

        expect(status).toHaveBeenCalledWith(400);
        expect(json).toHaveBeenCalledWith({
            statusCode: 400,
            message: '入力の形が正しくありません',
        });
        expect(warn).toHaveBeenCalled();
        expect(error).not.toHaveBeenCalled();
    });

    it('55P03（lock_timeout 超過）は 503 で返し、warn で記録する', () => {
        const warn = vi
            .spyOn(Logger.prototype, 'warn')
            .mockImplementation(() => {});
        const error = vi
            .spyOn(Logger.prototype, 'error')
            .mockImplementation(() => {});
        const { host, status, json } = createHost();

        new InvalidTextRepresentationFilter().catch(createError('55P03'), host);

        expect(status).toHaveBeenCalledWith(503);
        expect(json).toHaveBeenCalledWith({
            statusCode: 503,
            message: '混み合っています。少し待ってからもう一度お試しください',
        });
        expect(warn).toHaveBeenCalled();
        expect(error).not.toHaveBeenCalled();
    });

    it('22P02・55P03 以外は 500 で返し、元の例外を error で記録する', () => {
        const error = vi
            .spyOn(Logger.prototype, 'error')
            .mockImplementation(() => {});
        const { host, status, json } = createHost();
        const exception = createError('23505');

        new InvalidTextRepresentationFilter().catch(exception, host);

        expect(status).toHaveBeenCalledWith(500);
        expect(json).toHaveBeenCalledWith({
            statusCode: 500,
            message: 'Internal server error',
        });
        expect(error).toHaveBeenCalledWith(exception.message, exception.stack);
    });

    it('QueryFailedError だけを拾う', () => {
        expect(
            Reflect.getMetadata(
                '__filterCatchExceptions__',
                InvalidTextRepresentationFilter,
            ),
        ).toEqual([QueryFailedError]);
    });
});

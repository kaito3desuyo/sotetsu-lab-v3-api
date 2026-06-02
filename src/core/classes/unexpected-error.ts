import { CustomError } from 'ts-custom-error';

export class UnexpectedError extends CustomError {
    constructor(
        readonly message: string,
        readonly context: Record<string, unknown> = {},
    ) {
        super(message);
        Object.defineProperty(this, 'name', { value: 'UnexpectedError' });
    }
}

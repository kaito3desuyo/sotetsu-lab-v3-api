import { CustomError } from 'ts-custom-error';

export class UseCaseError extends CustomError {
    constructor(
        readonly message: string,
        readonly context: Record<string, unknown> = {},
    ) {
        super(message);
        Object.defineProperty(this, 'name', { value: 'UseCaseError' });
    }
}

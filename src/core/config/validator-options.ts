import { ValidatorOptions } from 'class-validator';

export const validatorOptions: ValidatorOptions = {
    whitelist: true,
    forbidNonWhitelisted: false,
    forbidUnknownValues: true,
    validationError: {
        target: false,
    },
};

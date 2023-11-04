import { HttpStatus, ValidationPipeOptions } from '@nestjs/common';
import { ValidatorOptions } from 'class-validator';

export const validatorOptions: ValidatorOptions = {
    whitelist: true,
    forbidNonWhitelisted: false,
    forbidUnknownValues: true,
    validationError: {
        target: false,
    },
};

export const validationPipeOptions: ValidationPipeOptions = {
    ...validatorOptions,
    transform: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
};

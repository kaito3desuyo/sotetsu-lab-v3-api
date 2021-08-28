import {
    UnprocessableEntityException,
    ValidationPipe,
    ValidationPipeOptions,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { validatorOptions } from '../config/validator-options';

export const customValidationPipe = (
    options: ValidationPipeOptions = {},
): ValidationPipe =>
    new ValidationPipe({
        ...validatorOptions,
        transform: true,
        exceptionFactory: (errors: ValidationError[]) => {
            return new UnprocessableEntityException(errors);
        },
        ...options,
    });

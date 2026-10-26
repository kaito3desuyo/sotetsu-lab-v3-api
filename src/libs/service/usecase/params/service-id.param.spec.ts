import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { validationPipeOptions } from '../../../../core/configs/validator-options.js';
import { ServiceIdParam } from './service-id.param.js';

const pipe = new ValidationPipe(validationPipeOptions);
const ID = '3f0b6a5e-8a52-4c1c-9d0a-2b5d1b8e7a11';

describe('ServiceIdParam', () => {
    const transform = (value: unknown) =>
        pipe.transform(value, { type: 'param', metatype: ServiceIdParam });

    it('UUID の id は通す', async () => {
        await expect(transform({ id: ID })).resolves.toMatchObject({
            id: ID,
        });
    });

    it.each(['not-a-uuid', '', '123'])(
        'UUID でない id（%s）は 422 になる',
        async (value) => {
            await expect(transform({ id: value })).rejects.toMatchObject({
                status: validationPipeOptions.errorHttpStatusCode,
            });
        },
    );
});


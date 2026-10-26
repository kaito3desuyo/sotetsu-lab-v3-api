import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { validationPipeOptions } from '../../../../core/configs/validator-options.js';
import { TripStationIdParam } from './trip-station-id.param.js';

const pipe = new ValidationPipe(validationPipeOptions);
const ID = '3f0b6a5e-8a52-4c1c-9d0a-2b5d1b8e7a11';

describe('TripStationIdParam', () => {
    const transform = (value: unknown) =>
        pipe.transform(value, { type: 'param', metatype: TripStationIdParam });

    it('UUID の stationId は通す', async () => {
        await expect(transform({ stationId: ID })).resolves.toMatchObject({
            stationId: ID,
        });
    });

    it.each(['not-a-uuid', '', '123'])(
        'UUID でない stationId（%s）は 422 になる',
        async (value) => {
            await expect(transform({ stationId: value })).rejects.toMatchObject({
                status: validationPipeOptions.errorHttpStatusCode,
            });
        },
    );
});


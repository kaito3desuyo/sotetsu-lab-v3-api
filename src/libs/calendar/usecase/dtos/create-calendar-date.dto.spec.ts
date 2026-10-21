import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { validationPipeOptions } from '../../../../core/configs/validator-options.js';
import { CreateCalendarDateDto } from './create-calendar-date.dto.js';

const pipe = new ValidationPipe(validationPipeOptions);
const transform = (body: unknown) =>
    pipe.transform(body, { type: 'body', metatype: CreateCalendarDateDto });

const valid = {
    calendarId: '7b0f4b8e-3d0a-4c5e-9a43-2f1d6c7e8a90',
    date: '2026-10-21',
    exceptionType: 1,
};

describe('CreateCalendarDateDto', () => {
    it('送られてきた id は落とす', async () => {
        const result = await transform({ ...valid, id: 'x' });
        expect(result).not.toHaveProperty('id');
        expect(result).toMatchObject(valid);
    });

    it('memo は省略しても null でもよい', async () => {
        await expect(transform(valid)).resolves.toMatchObject(valid);
        await expect(
            transform({ ...valid, memo: null }),
        ).resolves.toMatchObject({ ...valid, memo: null });
    });

    it('memo に文字列以外は通さない', async () => {
        await expect(transform({ ...valid, memo: 1 })).rejects.toThrow();
    });

    it('例外の種別が 1・2 以外なら通さない', async () => {
        await expect(
            transform({ ...valid, exceptionType: 3 }),
        ).rejects.toThrow();
    });
});

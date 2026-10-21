import 'reflect-metadata';
import { UnexpectedError } from '../../../../core/classes/unexpected-error.js';
import { TripBlockDetailsDto } from '../dtos/trip-block-details.dto.js';
import { TripBlockDomainBuilder } from './trip-block.domain.builder.js';

describe('TripBlockDomainBuilder.buildFromDetailsDto', () => {
    it('列車（trips）を結合していない DTO からは組み立てられず UnexpectedError', () => {
        const dto = Object.assign(new TripBlockDetailsDto(), { id: 'block' });

        expect(() => TripBlockDomainBuilder.buildFromDetailsDto(dto)).toThrow(
            UnexpectedError,
        );
    });

    it('列車が空の配列なら列車の無い block になる', () => {
        const dto = Object.assign(new TripBlockDetailsDto(), {
            id: 'block',
            trips: [],
        });

        const block = TripBlockDomainBuilder.buildFromDetailsDto(dto);

        expect(block.id.value).toBe('block');
        expect(block.isTripEmpty()).toBe(true);
    });
});

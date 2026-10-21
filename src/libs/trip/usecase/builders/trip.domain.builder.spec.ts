import 'reflect-metadata';
import { UnexpectedError } from '../../../../core/classes/unexpected-error.js';
import { TripDetailsDto } from '../dtos/trip-details.dto.js';
import { TripDomainBuilder } from './trip.domain.builder.js';

const trip = (extra: Partial<TripDetailsDto>) =>
    Object.assign(new TripDetailsDto(), {
        id: 'trip',
        serviceId: 'svc',
        tripNumber: '9999T',
        tripClassId: 'cls',
        tripName: null,
        tripDirection: 0,
        tripBlockId: 'block',
        depotIn: false,
        depotOut: false,
        calendarId: 'cal',
        extraCalendarId: null,
        ...extra,
    });

describe('TripDomainBuilder.buildFromDetailsDto', () => {
    it('時刻（times）を結合していない DTO からは組み立てられず UnexpectedError', () => {
        expect(() =>
            TripDomainBuilder.buildFromDetailsDto(
                trip({ tripOperationLists: [] }),
            ),
        ).toThrow(UnexpectedError);
    });

    it('運用のつながり（tripOperationLists）を結合していない DTO からは組み立てられず UnexpectedError', () => {
        expect(() =>
            TripDomainBuilder.buildFromDetailsDto(trip({ times: [] })),
        ).toThrow(UnexpectedError);
    });

    it('時刻と運用のつながりが空の配列なら組み立てられる', () => {
        const domain = TripDomainBuilder.buildFromDetailsDto(
            trip({ times: [], tripOperationLists: [] }),
        );

        expect(domain.id.value).toBe('trip');
        expect(domain.props.tripNumber).toBe('9999T');
    });
});

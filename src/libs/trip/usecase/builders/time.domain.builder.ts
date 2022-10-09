import { Time, Times } from '../../domain/time.domain';
import { CreateTimeDto } from '../dtos/create-time.dto';

export const TimeDomainBuilder = {
    buildFromCreateDto: (dto: CreateTimeDto): Time => {
        return Time.create({
            tripId: dto.tripId ?? '',
            stationId: dto.stationId,
            stopId: dto.stopId,
            stopSequence: dto.stopSequence,
            pickupType: dto.pickupType,
            dropoffType: dto.dropoffType,
            arrivalDays: dto.arrivalDays,
            arrivalTime: dto.arrivalTime,
            departureDays: dto.departureDays,
            departureTime: dto.departureTime,
        });
    },
} as const;

export const TimesDomainBuilder = {
    buildFromCreateDto: (dtos: CreateTimeDto[]): Times => {
        return Times.create(
            dtos.map((o) => TimeDomainBuilder.buildFromCreateDto(o)),
        );
    },
} as const;

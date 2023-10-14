import { UniqueEntityId } from 'src/core/class/unique-entity-id';
import { Time, Times } from '../../domain/time.domain';
import { CreateTimeDto } from '../dtos/create-time.dto';
import { ReplaceTimeDto } from '../dtos/replace-time.dto';
import { TimeDetailsDto } from '../dtos/time-details.dto';

export const TimeDomainBuilder = {
    buildByDetailsDto: (dto: TimeDetailsDto): Time => {
        return Time.create(
            {
                tripId: dto.tripId,
                stationId: dto.stationId,
                stopId: dto.stopId,
                stopSequence: dto.stopSequence,
                pickupType: dto.pickupType,
                dropoffType: dto.dropoffType,
                arrivalDays: dto.arrivalDays,
                arrivalTime: dto.arrivalTime,
                departureDays: dto.departureDays,
                departureTime: dto.departureTime,
            },
            new UniqueEntityId(dto.id),
        );
    },
    buildByCreateDto: (dto: CreateTimeDto): Time => {
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
    buildByReplaceDto: (dto: ReplaceTimeDto): Time => {
        return Time.create(
            {
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
            },
            new UniqueEntityId(dto.id),
        );
    },
} as const;

export const TimesDomainBuilder = {
    buildByDetailsDto: (dtos: TimeDetailsDto[]): Times => {
        return Times.create(
            dtos.map((o) => TimeDomainBuilder.buildByDetailsDto(o)),
        );
    },
    buildByCreateDto: (dtos: CreateTimeDto[]): Times => {
        return Times.create(
            dtos.map((o) => TimeDomainBuilder.buildByCreateDto(o)),
        );
    },
    buildByReplaceDto: (dtos: ReplaceTimeDto[]): Times => {
        return Times.create(
            dtos.map((o) => TimeDomainBuilder.buildByReplaceDto(o)),
        );
    },
} as const;

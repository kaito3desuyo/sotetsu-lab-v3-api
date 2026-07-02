import { UniqueEntityId } from 'src/core/classes/unique-entity-id';
import { Time, Times } from '../../domain/time.domain';
import { CreateTimeDto } from '../dtos/create-time.dto';
import { ReplaceTimeDto } from '../dtos/replace-time.dto';
import { TimeDetailsDto } from '../dtos/time-details.dto';

export const TimeDomainBuilder = {
    buildFromDetailsDto: (dto: TimeDetailsDto): Time => {
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
    buildFromReplaceDto: (dto: ReplaceTimeDto): Time => {
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
    buildFromDetailsDto: (dtos: TimeDetailsDto[]): Times => {
        return Times.create(
            dtos.map((o) => TimeDomainBuilder.buildFromDetailsDto(o)),
        );
    },
    buildFromCreateDto: (dtos: CreateTimeDto[]): Times => {
        return Times.create(
            dtos.map((o) => TimeDomainBuilder.buildFromCreateDto(o)),
        );
    },
    buildFromReplaceDto: (dtos: ReplaceTimeDto[]): Times => {
        return Times.create(
            dtos.map((o) => TimeDomainBuilder.buildFromReplaceDto(o)),
        );
    },
} as const;

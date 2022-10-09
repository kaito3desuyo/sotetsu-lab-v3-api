import { Time, Times } from '../../domain/time.domain';
import { TimeModel } from '../models/time.model';

export const TimeModelBuilder = {
    buildFromDomain: (domain: Time): TimeModel => {
        return {
            id: domain.id.value,
            tripId: domain.props.tripId,
            stationId: domain.props.stationId,
            stopId: domain.props.stopId,
            stopSequence: domain.props.stopSequence,
            pickupType: domain.props.pickupType,
            dropoffType: domain.props.dropoffType,
            arrivalDays: domain.props.arrivalDays,
            arrivalTime: domain.props.arrivalTime,
            departureDays: domain.props.departureDays,
            departureTime: domain.props.departureTime,
        };
    },
} as const;

export const TimesModelBuilder = {
    buildFromDomain: (domains: Times): TimeModel[] => {
        return domains
            .getItems()
            .map((domain) => TimeModelBuilder.buildFromDomain(domain));
    },
} as const;

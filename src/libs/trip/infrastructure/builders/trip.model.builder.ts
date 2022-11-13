import { Trip, Trips } from '../../domain/trip.domain';
import { TripModel } from '../models/trip.model';
import { TimeModelBuilder } from './time.model.builder';
import { TripOperationListModelBuilder } from './trip-operation-list.model.builder';

export const TripModelBuilder = {
    buildFromDomain: (domain: Trip): TripModel => {
        return {
            id: domain.id.value,
            serviceId: domain.props.serviceId,
            tripNumber: domain.props.tripNumber,
            tripClassId: domain.props.tripClassId,
            tripName: domain.props.tripName,
            tripDirection: domain.props.tripDirection,
            tripBlockId: domain.props.tripBlockId,
            depotIn: domain.props.depotIn,
            depotOut: domain.props.depotOut,
            calendarId: domain.props.calendarId,
            extraCalendarId: domain.props.extraCalendarId,
            times: domain.props.times
                .getItems()
                .map((time) => TimeModelBuilder.buildFromDomain(time)),
            tripOperationLists: domain.props.tripOperationLists
                .getItems()
                .map((tripOperationList) =>
                    TripOperationListModelBuilder.buildFromDomain(
                        tripOperationList,
                    ),
                ),
        };
    },
} as const;

export const TripsModelBuilder = {
    buildFromDomain: (domains: Trips): TripModel[] => {
        return domains
            .getItems()
            .map((domain) => TripModelBuilder.buildFromDomain(domain));
    },
} as const;

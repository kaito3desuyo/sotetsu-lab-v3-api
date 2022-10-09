import {
    TripOperationList,
    TripOperationLists,
} from '../../domain/trip-operation-list.domain';
import { TripOperationListModel } from '../models/trip-operation-list.model';

export const TripOperationListModelBuilder = {
    buildFromDomain: (domain: TripOperationList): TripOperationListModel => {
        return {
            id: domain.id.value,
            tripId: domain.props.tripId,
            operationId: domain.props.operationId,
            startStationId: domain.props.startStationId,
            endStationId: domain.props.endStationId,
            startTimeId: domain.props.startTimeId,
            endTimeId: domain.props.endTimeId,
        };
    },
} as const;

export const TripOperationListsModelBuilder = {
    buildFromDomain: (
        domains: TripOperationLists,
    ): TripOperationListModel[] => {
        return domains
            .getItems()
            .map((domain) =>
                TripOperationListModelBuilder.buildFromDomain(domain),
            );
    },
} as const;

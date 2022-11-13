import { TripModelBuilder } from 'src/libs/trip/infrastructure/builders/trip.model.builder';
import { TripBlock, TripBlocks } from '../../domain/trip-block.domain';
import { TripBlockModel } from '../models/trip-block.model';

export const TripBlockModelBuilder = {
    buildFromDomain: (domain: TripBlock): TripBlockModel => {
        return {
            id: domain.id.value,
            trips: domain.props.trips
                .getItems()
                .map((trip) => TripModelBuilder.buildFromDomain(trip)),
        };
    },
} as const;

export const TripBlocksModelBuilder = {
    buildFromDomain: (domains: TripBlocks): TripBlockModel[] => {
        return domains
            .getItems()
            .map((domain) => TripBlockModelBuilder.buildFromDomain(domain));
    },
} as const;

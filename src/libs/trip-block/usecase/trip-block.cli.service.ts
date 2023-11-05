import { Injectable } from '@nestjs/common';
import { OperationQuery } from 'src/libs/operation/infrastructure/queries/operation.query';
import { SelectQueryBuilder } from 'typeorm';
import { TripBlockCommand } from '../infrastructure/commands/trip-block.command';
import { TripBlockModel } from '../infrastructure/models/trip-block.model';
import { TripBlockQuery } from '../infrastructure/queries/trip-block.query';
import { TripBlocksDomainBuilder } from './builders/trip-block.domain.builder';
import { CreateTripBlockDto } from './dtos/create-trip-block.dto';

@Injectable()
export class TripBlockCliService {
    constructor(
        private readonly tripBlockCommand: TripBlockCommand,
        private readonly tripBlockQuery: TripBlockQuery,
        private readonly operationQuery: OperationQuery,
    ) {}

    async copyTripBlocks(
        fromCalendarId: string,
        toCalendarId: string,
    ): Promise<void> {
        const tripBlockDtos = await this.tripBlockQuery.findMany({
            join: {
                alias: 'tripBlock',
                leftJoinAndSelect: {
                    trips: 'tripBlock.trips',
                    times: 'trips.times',
                    tripOperationLists: 'trips.tripOperationLists',
                    operation: 'tripOperationLists.operation',
                },
            },
            where: (qb: SelectQueryBuilder<TripBlockModel>) => {
                qb.where('trips.calendarId = :calendarId', {
                    calendarId: fromCalendarId,
                });
            },
        });

        const operationDtos = {
            from: await this.operationQuery.findMany({
                where: {
                    calendarId: fromCalendarId,
                },
            }),
            to: await this.operationQuery.findMany({
                where: {
                    calendarId: toCalendarId,
                },
            }),
        };

        const tripBlocks = TripBlocksDomainBuilder.buildByCreateDto(
            tripBlockDtos as CreateTripBlockDto[],
        );

        for (const tripBlock of tripBlocks.getItems()) {
            for (const trip of tripBlock.getTripItems()) {
                trip.update({
                    calendarId: toCalendarId,
                });

                const tripOperationList = trip.getFirstTripOperationList();

                if (tripOperationList) {
                    const fromOperationNumber = operationDtos.from.find(
                        (o) => o.id === tripOperationList.props.operationId,
                    )?.operationNumber;
                    const toOperationId = operationDtos.to.find(
                        (o) => o.operationNumber === fromOperationNumber,
                    )?.id;

                    tripOperationList.update({
                        operationId: toOperationId ?? null,
                    });
                }

                if (tripOperationList?.props.operationId === null) {
                    trip.removeTripOperationList(tripOperationList);
                }
            }
        }

        const result = await this.tripBlockCommand.bulkCreate(tripBlocks);

        console.log(JSON.stringify(result, null, 2));
    }
}

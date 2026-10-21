import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { OperationQuery } from '../../operation/infrastructure/queries/operation.query.js';
import { TripBlockCommand } from '../infrastructure/commands/trip-block.command.js';
import { TripBlockQuery } from '../infrastructure/queries/trip-block.query.js';
import { TripBlocksDomainBuilder } from './builders/trip-block.domain.builder.js';
import { CreateTripBlockDto } from './dtos/create-trip-block.dto.js';

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
            relations: {
                trips: {
                    times: true,
                    tripOperationLists: { operation: true },
                },
            },
            where: {
                trips: {
                    calendarId: fromCalendarId,
                },
            },
            // (qb: SelectQueryBuilder<TripBlockModel>) => {
            //     qb.where('trips.calendarId = :calendarId', {
            //         calendarId: fromCalendarId,
            //     });
            // },
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

        // コピー元の id 類は Create の @Exclude で落ちる（組み立て時にコピー先の id で埋め直される）
        const tripBlocks = TripBlocksDomainBuilder.buildFromCreateDto(
            plainToInstance(CreateTripBlockDto, tripBlockDtos),
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

                    if (toOperationId === undefined) {
                        trip.removeTripOperationList(tripOperationList);
                    } else {
                        tripOperationList.update({
                            operationId: toOperationId,
                        });
                    }
                }
            }
        }

        const result = await this.tripBlockCommand.bulkCreate(tripBlocks);

        console.log(JSON.stringify(result, null, 2));
    }
}

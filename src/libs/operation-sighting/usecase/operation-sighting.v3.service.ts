import { Injectable, NotFoundException } from '@nestjs/common';
import { OperationSightingCommand } from '../infrastructure/command/operation-sighting.command';
import { OperationSightingQuery } from '../infrastructure/query/operation-sighting.query';
import { OperationSightingDomainBuilder } from './builders/operation-sighting.domain.builder';
import { InvalidateOperationSightingDto } from './dtos/invalidate-operation-sighting.dto';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto';
import { RestoreOperationSightingDto } from './dtos/restore-operation-sighting.dto';

@Injectable()
export class OperationSightingV3Service {
    constructor(
        private readonly operationSightingCommand: OperationSightingCommand,
        private readonly operationSightingQuery: OperationSightingQuery,
    ) {}

    async invalidate(
        params: InvalidateOperationSightingDto,
    ): Promise<OperationSightingDetailsDto> {
        const { operationSightingId, userId, reason } = params;

        const dto = await this.operationSightingQuery.findOneById({
            id: operationSightingId,
        });

        if (!dto) {
            throw new NotFoundException(
                `OperationSighting with id ${operationSightingId} not found.`,
            );
        }

        const domain = OperationSightingDomainBuilder.buildByDetailsDto(dto);

        domain.invalidate(userId, reason);

        const result = await this.operationSightingCommand.save(domain);

        return result;
    }

    async restore(
        params: RestoreOperationSightingDto,
    ): Promise<OperationSightingDetailsDto> {
        const { operationSightingId, userId, reason } = params;

        const dto = await this.operationSightingQuery.findOneById({
            id: operationSightingId,
        });

        if (!dto) {
            throw new NotFoundException(
                `OperationSighting with id ${operationSightingId} not found.`,
            );
        }

        const domain = OperationSightingDomainBuilder.buildByDetailsDto(dto);

        domain.restore(userId, reason);

        const result = await this.operationSightingCommand.save(domain);

        return result;
    }
}

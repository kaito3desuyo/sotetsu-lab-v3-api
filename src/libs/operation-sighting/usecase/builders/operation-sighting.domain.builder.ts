import { OperationSighting } from '../../domain/operation-sighting.domain';
import { CreateOperationSightingDto } from '../dtos/create-operation-sighting.dto';

export const OperationSightingDomainBuilder = {
    buildByCreateDto: (dto: CreateOperationSightingDto): OperationSighting => {
        return OperationSighting.create({
            formationId: dto.formationId,
            operationId: dto.operationId,
            sightingTime: dto.sightingTime,
        });
    },
} as const;

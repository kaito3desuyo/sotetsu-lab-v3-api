import { UniqueEntityId } from '../../../../core/classes/unique-entity-id.js';
import { OperationSightingInvalidation } from '../../domain/operation-sighting-invalidation.domain.js';
import {
    OperationSightingManagementLog,
    OperationSightingManagementLogs,
} from '../../domain/operation-sighting-management-log.domain.js';
import { OperationSighting } from '../../domain/operation-sighting.domain.js';
import { CreateOperationSightingDto } from '../dtos/create-operation-sighting.dto.js';
import { OperationSightingDetailsDto } from '../dtos/operation-sighting-details.dto.js';

export const OperationSightingDomainBuilder = {
    buildFromDetailsDto: (
        dto: OperationSightingDetailsDto,
    ): OperationSighting => {
        return OperationSighting.create(
            {
                formationId: dto.formationId,
                operationId: dto.operationId,
                sightingTime: dto.sightingTime,
                invalidation: dto.invalidation
                    ? OperationSightingInvalidation.create(
                          {
                              operationSightingId:
                                  dto.invalidation.operationSightingId,
                          },
                          new UniqueEntityId(
                              dto.invalidation.operationSightingInvalidationId,
                          ),
                      )
                    : null,
                managementLogs: OperationSightingManagementLogs.create(
                    dto.managementLogs
                        ? dto.managementLogs.map((log) =>
                              OperationSightingManagementLog.create(
                                  {
                                      operationSightingId:
                                          log.operationSightingId,
                                      userId: log.userId,
                                      action: log.action,
                                      reason: log.reason,
                                  },
                                  new UniqueEntityId(
                                      log.operationSightingManagementLogId,
                                  ),
                              ),
                          )
                        : [],
                ),
            },
            new UniqueEntityId(dto.operationSightingId),
        );
    },
    buildFromCreateDto: (dto: CreateOperationSightingDto): OperationSighting => {
        return OperationSighting.create({
            formationId: dto.formationId,
            operationId: dto.operationId,
            sightingTime: dto.sightingTime,
            invalidation: null,
            managementLogs: OperationSightingManagementLogs.create([]),
        });
    },
} as const;

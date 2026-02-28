import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { OperationCurrentPositionDto } from '../usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from '../usecase/dtos/operation-details.dto';
import { OperationV3Service } from '../usecase/operation.v3.service';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class OperationV3Controller {
    constructor(private readonly operationV3Service: OperationV3Service) {}

    @Get('/calendar/:calendarId')
    async findManyByCalendarId(
        @Param('calendarId') calendarId: string,
    ): Promise<OperationDetailsDto[]> {
        const result = await this.operationV3Service.findManyByCalendarId({
            calendarId,
        });

        return result;
    }

    @Get('/from/:start/to/:end')
    async findManyBySpecificPeriod(
        @Param('start') start: string,
        @Param('end') end: string,
    ): Promise<OperationDetailsDto[]> {
        const result = await this.operationV3Service.findManyBySpecificPeriod({
            start,
            end,
        });

        return result;
    }

    @Get('/:id/current-position')
    async findOneWithCurrentPosition(
        @Param('id') operationId: string,
        @Query('searchTime') searchTime?: string,
    ): Promise<OperationCurrentPositionDto> {
        const result = await this.operationV3Service.findOneWithCurrentPosition(
            {
                operationId,
                searchTime,
            },
        );

        return result;
    }
}

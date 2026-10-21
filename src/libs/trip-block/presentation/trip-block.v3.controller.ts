import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CACHE_CONTROL } from '../../../core/modules/cache-control/cache-control.constants.js';
import { CacheControl } from '../../../core/modules/cache-control/cache-control.decorator.js';
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { AddTripToTripBlockDto } from '../usecase/dtos/add-trip-to-trip-block.dto.js';
import { CreateTripBlockDto } from '../usecase/dtos/create-trip-block.dto.js';
import { DeleteTripFromTripBlockDto } from '../usecase/dtos/delete-trip-from-trip-block.dto.js';
import { ReplaceTripBlockDto } from '../usecase/dtos/replace-trip-block.dto.js';
import { TripBlockDetailsDto } from '../usecase/dtos/trip-block-details.dto.js';
import { TripBlockSparseDto } from '../usecase/dtos/trip-block-sparse.dto.js';
import { AddTripToTripBlockParam } from '../usecase/params/add-trip-to-trip-block.param.js';
import { DeleteTripFromTripBlockParam } from '../usecase/params/delete-trip-from-trip-block.param.js';
import { ReplaceTripBlockParam } from '../usecase/params/replace-trip-block.param.js';
import { TripBlockFindManyByFilterQuery } from '../usecase/params/trip-block-find-many-by-filter.query.js';
import { TripBlockV3Service } from '../usecase/trip-block.v3.service.js';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class TripBlockV3Controller {
    constructor(private readonly tripBlockV3Service: TripBlockV3Service) {}

    /** `fields[資源]=項目,項目` で返す項目を選べる（docs/adr/0002-v3-sparse-fieldsets.md） */
    @Get('/')
    @CacheControl(CACHE_CONTROL.TIMETABLE)
    async findManyByFilter(
        @Query() query: TripBlockFindManyByFilterQuery,
    ): Promise<TripBlockDetailsDto[] | TripBlockSparseDto[]> {
        const result = await this.tripBlockV3Service.findManyByFilter({
            calendarId: query.calendarId,
            tripDirection: query.tripDirection,
            fields: query.fields,
        });

        return result;
    }

    @Get('/:id')
    @CacheControl(CACHE_CONTROL.TIMETABLE)
    async findOneById(@Param('id') id: string): Promise<TripBlockDetailsDto> {
        const result = await this.tripBlockV3Service.findOneById({ id });

        return result;
    }

    @Post('/bulk')
    async createManyTripBlocks(
        @Body() dtos: CreateTripBlockDto[],
    ): Promise<TripBlockDetailsDto[]> {
        const result = await this.tripBlockV3Service.createManyTripBlocks(dtos);

        return result;
    }

    @Put('/:id')
    async replaceOneTripBlock(
        @Param() param: ReplaceTripBlockParam,
        @Body() dto: ReplaceTripBlockDto,
    ): Promise<TripBlockDetailsDto> {
        const result = await this.tripBlockV3Service.replaceOneTripBlock({
            id: param.id,
            dto,
        });

        return result;
    }

    @Patch('/:id/add-trip')
    async addTripToTripBlock(
        @Param() param: AddTripToTripBlockParam,
        @Body() dto: AddTripToTripBlockDto,
    ): Promise<TripBlockDetailsDto> {
        const result = await this.tripBlockV3Service.addTripToTripBlock({
            id: param.id,
            dto,
        });

        return result;
    }

    @Patch('/:id/delete-trip')
    async deleteTripFromTripBlock(
        @Param() param: DeleteTripFromTripBlockParam,
        @Body() dto: DeleteTripFromTripBlockDto,
    ): Promise<TripBlockDetailsDto> {
        const result = await this.tripBlockV3Service.deleteTripFromTripBlock({
            id: param.id,
            dto,
        });

        return result;
    }
}

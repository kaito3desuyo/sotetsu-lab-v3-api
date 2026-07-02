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
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { AddTripToTripBlockDto } from '../usecase/dtos/add-trip-to-trip-block.dto';
import { CreateTripBlockDto } from '../usecase/dtos/create-trip-block.dto';
import { DeleteTripFromTripBlockDto } from '../usecase/dtos/delete-trip-from-trip-block.dto';
import { ReplaceTripBlockDto } from '../usecase/dtos/replace-trip-block.dto';
import { TripBlockDetailsDto } from '../usecase/dtos/trip-block-details.dto';
import { AddTripToTripBlockParam } from '../usecase/params/add-trip-to-trip-block.param';
import { DeleteTripFromTripBlockParam } from '../usecase/params/delete-trip-from-trip-block.param';
import { ReplaceTripBlockParam } from '../usecase/params/replace-trip-block.param';
import { TripBlockFindManyByFilterQuery } from '../usecase/params/trip-block-find-many-by-filter.query';
import { TripBlockV3Service } from '../usecase/trip-block.v3.service';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class TripBlockV3Controller {
    constructor(private readonly tripBlockV3Service: TripBlockV3Service) {}

    @Get('/')
    async findManyByFilter(
        @Query() query: TripBlockFindManyByFilterQuery,
    ): Promise<TripBlockDetailsDto[]> {
        const result = await this.tripBlockV3Service.findManyByFilter({
            calendarId: query.calendarId,
            tripDirection: query.tripDirection,
        });

        return result;
    }

    @Get('/:id')
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

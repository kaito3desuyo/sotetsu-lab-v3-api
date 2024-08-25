import {
    Crud,
    CrudRequest,
    CrudRequestInterceptor,
    Override,
    ParsedRequest,
} from '@dataui/crud';
import {
    Controller,
    Get,
    Param,
    Req,
    Res,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { isArray } from 'lodash';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { addPaginationHeaders } from 'src/core/utils/pagination-header';
import { BaseFormationDto } from '../usecase/dtos/base-formation.dto';
import { FormationV2Service } from '../usecase/formation.v2.service';
import { FormationFindManyBySpecificDateParam } from '../usecase/params/formation-find-many-by-specific-date.param';
import { FormationFindManyBySpecificPeriodParam } from '../usecase/params/formation-find-many-by-specific-period.param';

@Crud({
    model: {
        type: BaseFormationDto,
    },
    routes: {
        only: ['getManyBase', 'getOneBase'],
    },
    query: {
        join: {
            // ['agency']: {},
            ['vehicleFormations']: {},
            ['vehicleFormations.vehicle']: {},
        },
    },
    params: {
        id: {
            field: 'id',
            type: 'uuid',
            primary: true,
        },
        date: {
            disabled: true,
        },
        startDate: {
            disabled: true,
        },
        endDate: {
            disabled: true,
        },
    },
})
@Controller()
@UseGuards(AuthGuard)
export class FormationV2Controller {
    constructor(private readonly formationV2Service: FormationV2Service) {}

    @Override('getManyBase')
    @Get()
    async findMany(
        @ParsedRequest() crudReq: CrudRequest,
        // @Query() query: any,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const formations = await this.formationV2Service.findMany(crudReq);

        res.header('Cache-Control', 'max-age=2592000, must-revalidate');

        if (isArray(formations)) {
            res.json(formations);
        } else {
            addPaginationHeaders(req, res, formations);
            res.json(formations.data);
        }
    }

    @Override('getOneBase')
    @Get(':id')
    async findOne(
        @ParsedRequest() crudReq: CrudRequest,
        @Res() res: Response,
    ): Promise<void> {
        const formation = await this.formationV2Service.findOne(crudReq);

        res.header('Cache-Control', 'max-age=2592000, must-revalidate');

        res.json(formation);
    }

    @Get('as/of/:date')
    @UseInterceptors(CrudRequestInterceptor)
    async findManyBySpecificDate(
        @ParsedRequest() crudReq: CrudRequest,
        @Param() params: FormationFindManyBySpecificDateParam,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const formations = await this.formationV2Service.findManyBySpecificDate(
            crudReq,
            params,
        );

        res.header('Cache-Control', 'max-age=2592000, must-revalidate');

        if (isArray(formations)) {
            res.json(formations);
        } else {
            addPaginationHeaders(req, res, formations);
            res.json(formations.data);
        }
    }

    @Get('from/:startDate/to/:endDate')
    @UseInterceptors(CrudRequestInterceptor)
    async findManyBySpecificPeriod(
        @ParsedRequest() crudReq: CrudRequest,
        @Param() params: FormationFindManyBySpecificPeriodParam,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const formations =
            await this.formationV2Service.findManyBySpecificPeriod(
                crudReq,
                params,
            );

        res.header('Cache-Control', 'max-age=2592000, must-revalidate');

        if (isArray(formations)) {
            res.json(formations);
        } else {
            addPaginationHeaders(req, res, formations);
            res.json(formations.data);
        }
    }
}

import {
    Controller,
    Get,
    Param,
    Req,
    Res,
    UnprocessableEntityException,
    UseInterceptors,
} from '@nestjs/common';
import {
    Crud,
    CrudRequest,
    CrudRequestInterceptor,
    Override,
    ParsedRequest,
} from '@nestjsx/crud';
import { Request, Response } from 'express';
import { isArray } from 'lodash';
import moment from 'moment';
import { addPaginationHeaders } from 'src/core/util/pagination-header';
import { FormationModel } from '../infrastructure/models/formation.model';
import { FormationDetailsDto } from '../usecase/dtos/formation-details.dto';
import { FormationV2Service } from '../usecase/formation.v2.service';
import { FormationFindManyBySpecificDateParam } from '../usecase/params/formation-find-many-by-specific-date.param';
import { FormationFindManyBySpecificPeriodParam } from '../usecase/params/formation-find-many-by-specific-period.param';

@Crud({
    model: {
        type: FormationModel,
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
// @UseGuards(AuthGuard('jwt'))
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
    ): Promise<FormationDetailsDto> {
        const formation = await this.formationV2Service.findOne(crudReq);
        return formation;
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
        const formations = await this.formationV2Service.findManyBySpecificPeriod(
            crudReq,
            params,
        );

        if (isArray(formations)) {
            res.json(formations);
        } else {
            addPaginationHeaders(req, res, formations);
            res.json(formations.data);
        }
    }
}

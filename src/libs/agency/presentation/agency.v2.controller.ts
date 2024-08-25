import { Crud, CrudRequest, Override, ParsedRequest } from '@dataui/crud';
import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { isArray } from 'lodash';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { addPaginationHeaders } from 'src/core/utils/pagination-header';
import { AgencyModel } from '../infrastructure/models/agency.model';
import { AgencyV2Service } from '../usecase/agency.v2.service';

@Crud({
    model: {
        type: AgencyModel,
    },
    routes: {
        only: ['getManyBase', 'getOneBase'],
    },
    query: {
        join: {
            routes: {},
        },
    },
    params: {
        id: {
            field: 'id',
            type: 'uuid',
            primary: true,
        },
    },
})
@Controller()
@UseGuards(AuthGuard)
// @UseInterceptors(CrudRequestInterceptor)
export class AgencyV2Controller {
    constructor(private readonly agencyV2Service: AgencyV2Service) {}

    @Override('getManyBase')
    @Get()
    async findMany(
        @ParsedRequest() crudReq: CrudRequest,
        // @Query() query: any,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const agencies = await this.agencyV2Service.findMany(crudReq);

        res.header('Cache-Control', 'max-age=2592000, must-revalidate');

        if (isArray(agencies)) {
            res.json(agencies);
        } else {
            addPaginationHeaders(req, res, agencies);
            res.json(agencies.data);
        }
    }

    @Override('getOneBase')
    @Get(':id')
    async findOne(
        @ParsedRequest() crudReq: CrudRequest,
        @Res() res: Response,
    ): Promise<void> {
        const agency = await this.agencyV2Service.findOne(crudReq);

        res.header('Cache-Control', 'max-age=2592000, must-revalidate');

        res.json(agency);
    }
}

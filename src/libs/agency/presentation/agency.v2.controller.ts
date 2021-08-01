import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Crud, CrudRequest, Override, ParsedRequest } from '@nestjsx/crud';
import { Request, Response } from 'express';
import { isArray } from 'lodash';
import { addPaginationHeaders } from 'src/core/util/pagination-header';
import { AgencyV2Service } from '../usecase/agency.v2.service';
import { AgencyDetailsDto } from '../usecase/dtos/agency-details.dto';
import { BaseAgencyDto } from '../usecase/dtos/base-agency.dto';

@Crud({
    model: {
        type: BaseAgencyDto,
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
@UseGuards(AuthGuard('jwt'))
// @UseInterceptors(CrudRequestInterceptor)
export class AgencyV2Controller {
    constructor(private readonly agencyV2Service: AgencyV2Service) {}

    @Override('getManyBase')
    @Get()
    async findMany(
        @ParsedRequest() crudReq: CrudRequest,
        @Query() query: any,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const agencies = await this.agencyV2Service.findMany(crudReq);

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
    ): Promise<AgencyDetailsDto> {
        const agency = await this.agencyV2Service.findOne(crudReq);
        return agency;
    }
}

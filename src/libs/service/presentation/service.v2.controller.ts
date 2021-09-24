import { Controller, Get, Req, Res } from '@nestjs/common';
import { Crud, CrudRequest, Override, ParsedRequest } from '@nestjsx/crud';
import { Request, Response } from 'express';
import { isArray } from 'lodash';
import { addPaginationHeaders } from 'src/core/util/pagination-header';
import { ServiceModel } from '../infrastructure/models/service.model';
import { ServiceDetailsDto } from '../usecase/dtos/service-details.dto';
import { ServiceV2Service } from '../usecase/service.v2.service';

@Crud({
    model: {
        type: ServiceModel,
    },
    routes: {
        only: ['getManyBase', 'getOneBase'],
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
// @UseGuards(AuthGuard('jwt'))
export class ServiceV2Controller {
    constructor(private readonly serviceV2Service: ServiceV2Service) {}

    @Override('getManyBase')
    @Get()
    async findMany(
        @ParsedRequest() crudReq: CrudRequest,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const services = await this.serviceV2Service.findMany(crudReq);

        if (isArray(services)) {
            res.json(services);
        } else {
            addPaginationHeaders(req, res, services);
            res.json(services.data);
        }
    }

    @Override('getOneBase')
    @Get(':id')
    async findOne(
        @ParsedRequest() crudReq: CrudRequest,
    ): Promise<ServiceDetailsDto> {
        const service = await this.serviceV2Service.findOne(crudReq);
        return service;
    }
}

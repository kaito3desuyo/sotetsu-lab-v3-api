import { Crud, CrudRequest, Override, ParsedRequest } from '@dataui/crud';
import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { isArray } from 'lodash';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { addPaginationHeaders } from 'src/core/utils/pagination-header';
import { VehicleModel } from '../infrastructure/models/vehicle.model';
import { VehicleV2Service } from '../usecase/vehicle.v2.service';

@Crud({
    model: {
        type: VehicleModel,
    },
    routes: {
        only: ['getManyBase', 'getOneBase'],
    },
    query: {
        join: {
            ['vehicleFormations']: {},
            ['vehicleFormations.formation']: {},
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
export class VehicleV2Controller {
    constructor(private readonly vehicleV2Service: VehicleV2Service) {}

    @Override('getManyBase')
    @Get()
    async findMany(
        @ParsedRequest() crudReq: CrudRequest,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const vehicles = await this.vehicleV2Service.findMany(crudReq);

        res.header('Cache-Control', 'max-age=2592000, must-revalidate');

        if (isArray(vehicles)) {
            res.json(vehicles);
        } else {
            addPaginationHeaders(req, res, vehicles);
            res.json(vehicles.data);
        }
    }

    @Override('getOneBase')
    @Get(':id')
    async findOne(
        @ParsedRequest() crudReq: CrudRequest,
        @Res() res: Response,
    ): Promise<void> {
        const vehicle = await this.vehicleV2Service.findOne(crudReq);

        res.header('Cache-Control', 'max-age=2592000, must-revalidate');

        res.json(vehicle);
    }
}

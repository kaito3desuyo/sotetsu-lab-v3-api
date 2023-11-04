import { Controller, Get, Req, Res } from '@nestjs/common';
import { Crud, CrudRequest, Override, ParsedRequest } from '@nestjsx/crud';
import { VehicleModel } from '../infrastructure/models/vehicle.model';
import { Request, Response } from 'express';
import { VehicleV2Service } from '../usecase/vehicle.v2.service';
import { isArray } from 'lodash';
import { addPaginationHeaders } from 'src/core/utils/pagination-header';
import { VehicleDetailsDto } from '../usecase/dtos/vehicle-details.dto';

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
    ): Promise<VehicleDetailsDto> {
        const vehicle = await this.vehicleV2Service.findOne(crudReq);
        return vehicle;
    }
}

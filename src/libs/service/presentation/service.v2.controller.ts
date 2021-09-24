import { Controller, Get, Req, Res } from '@nestjs/common';
import { Crud, CrudRequest, Override, ParsedRequest } from '@nestjsx/crud';
import { Request, Response } from 'express';
import { ServiceModel } from '../infrastructure/models/service.model';

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
    // constructor() {}

    @Override('getManyBase')
    @Get()
    async findMany(
        @ParsedRequest() crudReq: CrudRequest,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        res.json('findMany');
    }

    @Override('getOneBase')
    @Get(':id')
    async findOne(
        @ParsedRequest() crudReq: CrudRequest,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        res.json('findOne');
    }
}

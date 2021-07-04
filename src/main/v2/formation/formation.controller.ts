import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
    Crud,
    CrudController,
    CrudRequest,
    Override,
    ParsedRequest,
} from '@nestjsx/crud';
import { Formation } from '../../../main/v1/formation/formation.entity';
import { FormationService } from './formation.service';

@Crud({
    model: {
        type: Formation,
    },
})
@Controller()
@UseGuards(AuthGuard('jwt'))
export class FormationController {
    constructor(public service: FormationService) {}

    get base(): CrudController<Formation> {
        return this;
    }

    @Override()
    getMany(@ParsedRequest() req: CrudRequest) {
        // console.log(req);
        return this.base.getManyBase(req);
    }

    @Get('hoge')
    hoge() {
        return 'hoge';
    }
}

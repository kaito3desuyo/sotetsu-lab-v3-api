import {
  Crud,
  CrudController,
  Override,
  ParsedRequest,
  CrudRequest,
} from '@nestjsx/crud';
import { Formation } from '../../../main/v1/formation/formation.entity';
import { Controller, Get } from '@nestjs/common';
import { FormationService } from './formation.service';

@Crud({
  model: {
    type: Formation,
  },
})
@Controller()
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
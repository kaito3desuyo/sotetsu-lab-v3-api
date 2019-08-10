import { Controller, Get } from '@nestjs/common';
import { Calender } from './calender.entity';
import { CalenderService } from './calender.service';

@Controller()
export class CalenderController {
  constructor(private calenderService: CalenderService) {}

  @Get()
  async getAgencies(): Promise<Calender[]> {
    const calenders = await this.calenderService.findAll();
    return calenders;
  }
}

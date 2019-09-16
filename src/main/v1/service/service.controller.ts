import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Service } from './service.entity';
import { ServiceService } from './service.service';

@Controller()
export class ServiceController {
  constructor(private serviceService: ServiceService) {}

  @Get()
  async getServices(): Promise<Service[]> {
    const services = await this.serviceService.findAll({
      relations: ['service_to_routes'],
    });
    return services;
  }

  @Get('/search')
  async searchServices(@Query() query: { service_name?: string }): Promise<{
    services: Service[];
  }> {
    const whereObj = {};
    if (query.service_name) {
      // tslint:disable-next-line: no-string-literal
      whereObj['service_name'] = query.service_name;
    }

    try {
      const services = await this.serviceService.findAll({
        where: whereObj,
      });
      return { services };
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }
}

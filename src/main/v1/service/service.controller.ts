import { Controller, Get } from "@nestjs/common";
import { Service } from "./service.entity";
import { ServiceService } from "./service.service";
import { Route } from "../route/route.entity";

@Controller()
export class ServiceController {
    constructor(private serviceService: ServiceService) {}

    @Get()
    async getServices(): Promise<Service[]> {
        const services = await this.serviceService.findAll({
            relations: ['service_to_routes'],
           
        });
        return services
    }
}
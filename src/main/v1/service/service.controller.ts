import {
    Controller,
    Get,
    Query,
    HttpException,
    HttpStatus,
    UseGuards,
    UnprocessableEntityException,
    Param,
} from '@nestjs/common';
import { Service } from './service.entity';
import { ServiceService } from './service.service';
import { sortBy, findIndex, some } from 'lodash';
import { RouteStationList } from '../route-station-list/route-station-list.entity';
import { AuthGuard } from './../../../shared/guards/auth.guard';
import { Station } from '../station/station.entity';

@Controller()
@UseGuards(AuthGuard)
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
    async searchServices(
        @Query()
        query: {
            service_name?: string;
        },
    ): Promise<{
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

    @Get('/:serviceId/stations')
    async getServiceStationsById(
        @Param()
        params: { serviceId: string },
        @Query()
        query: {
            trip_direction: '0' | '1';
        },
    ): Promise<{ stations: Station[] }> {
        if (!query.trip_direction) {
            throw new UnprocessableEntityException(
                'please set `trip_direction` query.',
            );
        }

        if (query.trip_direction !== '0' && query.trip_direction !== '1') {
            throw new UnprocessableEntityException(
                '`trip_direction` query invalid.',
            );
        }

        return this.serviceService.findStationsByServiceId(
            params.serviceId,
            query.trip_direction,
        );
    }
}

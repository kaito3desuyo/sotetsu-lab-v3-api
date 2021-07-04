import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Post,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SelectQueryBuilder } from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { VehicleService } from './vehicle.service';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class VehicleController {
    constructor(private vehicleService: VehicleService) {}

    @Get()
    async getVehicles(): Promise<Vehicle[]> {
        const vehicles = await this.vehicleService.findAll({});
        return vehicles;
    }

    @Post('/search')
    async searchVehicles(
        @Body()
        body: {
            number?: string;
            relations?: string[];
        },
    ) {
        if (!body) {
            throw new HttpException(
                'Please set search query.',
                HttpStatus.UNPROCESSABLE_ENTITY,
            );
        }

        const searchVehicleNumber = (qb: SelectQueryBuilder<Vehicle>) => {
            return qb.andWhere('vehicle_number = :vehicleNumber', {
                vehicleNumber: body.number,
            });
        };

        const vehicleQueryBuilder = this.vehicleService.createQueryBuilder();
        let searchQuery: SelectQueryBuilder<Vehicle> = vehicleQueryBuilder;
        if (body.number) {
            searchQuery = searchVehicleNumber(searchQuery);
        }

        try {
            const searchResult = await searchQuery.getMany();

            const resultDetail = await this.vehicleService.findAll({
                where: searchResult.map((data) => ({ id: data.id })),
                relations: body.relations,
            });

            return resultDetail;
        } catch (e) {
            throw new HttpException(e.message, HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }
}

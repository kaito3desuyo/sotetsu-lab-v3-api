import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { VehicleQuery } from '../infrastructure/queries/vehicle.query';
import { VehicleDetailsDto } from './dtos/vehicle-details.dto';

@Injectable()
export class VehicleV2Service {
    constructor(private readonly vehicleQuery: VehicleQuery) {}

    findMany(
        query: CrudRequest,
    ): Promise<
        VehicleDetailsDto[] | GetManyDefaultResponse<VehicleDetailsDto>
    > {
        return this.vehicleQuery.findManyVehicles(query);
    }

    findOne(query: CrudRequest): Promise<VehicleDetailsDto> {
        return this.vehicleQuery.findOneVehicle(query);
    }
}

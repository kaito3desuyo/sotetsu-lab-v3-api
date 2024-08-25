import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isArray } from 'lodash';
import { Repository } from 'typeorm';
import { VehicleDetailsDto } from '../../usecase/dtos/vehicle-details.dto';
import { buildVehicleDetailsDto } from '../builders/vehicle-dto.builder';
import { VehicleModel } from '../models/vehicle.model';

@Injectable()
export class VehicleQuery extends TypeOrmCrudService<VehicleModel> {
    constructor(
        @InjectRepository(VehicleModel)
        private readonly vehicleRepository: Repository<VehicleModel>,
    ) {
        super(vehicleRepository);
    }

    async findManyVehicles(
        query: CrudRequest,
    ): Promise<
        VehicleDetailsDto[] | GetManyDefaultResponse<VehicleDetailsDto>
    > {
        const models = await this.getMany(query);

        if (isArray(models)) {
            return models.map((o) => buildVehicleDetailsDto(o));
        } else {
            const data = models.data.map((o) => buildVehicleDetailsDto(o));
            return {
                ...models,
                data,
            };
        }
    }

    async findOneVehicle(query: CrudRequest): Promise<VehicleDetailsDto> {
        const model = await this.getOne(query);

        if (!model) {
            return null;
        }

        return buildVehicleDetailsDto(model);
    }
}

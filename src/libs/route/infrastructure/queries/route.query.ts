import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { TypeOrmCrudService } from '@nestjsx/crud-typeorm';
import { isArray } from 'lodash';
import { Repository } from 'typeorm';
import { RouteDetailsDto } from '../../usecase/dtos/route-details.dto';
import { buildRouteDetailsDto } from '../builders/route-dto.builder';
import { RouteModel } from '../models/route.model';

@Injectable()
export class RouteQuery extends TypeOrmCrudService<RouteModel> {
    constructor(
        @InjectRepository(RouteModel)
        private readonly routeRepository: Repository<RouteModel>,
    ) {
        super(routeRepository);
    }

    async findManyRoutes(
        query: CrudRequest,
    ): Promise<RouteDetailsDto[] | GetManyDefaultResponse<RouteDetailsDto>> {
        const models = await this.getMany(query);

        if (isArray(models)) {
            return models.map((o) => buildRouteDetailsDto(o));
        } else {
            const data = models.data.map((o) => buildRouteDetailsDto(o));
            return {
                ...models,
                data,
            };
        }
    }

    async findOneRoute(query: CrudRequest): Promise<RouteDetailsDto> {
        const model = await this.getOne(query);

        if (!model) {
            return null;
        }

        return buildRouteDetailsDto(model);
    }
}

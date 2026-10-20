import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripClassDetailsDto } from '../../usecase/dtos/trip-class-details.dto';
import { TripClassesDtoBuilder } from '../builders/trip-class.dto.builder';
import { TripClassModel } from '../models/trip-class.model';

@Injectable()
export class TripClassQuery {
    constructor(
        @InjectRepository(TripClassModel)
        private readonly tripClassRepository: Repository<TripClassModel>,
    ) {}

    async findMany(params?: {
        serviceId?: string;
    }): Promise<TripClassDetailsDto[]> {
        const { serviceId } = params ?? {};

        let qb = this.tripClassRepository
            .createQueryBuilder('tripClass')
            .select('tripClass');

        if (serviceId) {
            qb = qb.where('tripClass.service_id = :serviceId', { serviceId });
        }

        // 並べないと物理順になり、更新した行から崩れる（相鉄→直通先→回送・不明の順が sequence）
        const models = await qb.orderBy('tripClass.sequence', 'ASC').getMany();
        return TripClassesDtoBuilder.buildFromModel(models);
    }
}

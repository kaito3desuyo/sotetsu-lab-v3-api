import { Injectable } from '@nestjs/common';
import { CustomRepository } from 'src/core/classes/custom-repository';
import { OperationModel } from '../models/operation.model';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class OperationRepository extends CustomRepository<OperationModel> {
    constructor(
        @InjectRepository(OperationModel)
        protected readonly repository: Repository<OperationModel>,
    ) {
        super(repository);
    }
}

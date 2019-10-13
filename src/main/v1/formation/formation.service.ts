import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Formation } from './formation.entity';
import { Repository, QueryRunner, FindManyOptions } from 'typeorm';

@Injectable()
export class FormationService {
  constructor(
    @InjectRepository(Formation)
    private readonly formationRepository: Repository<Formation>,
  ) {}

  query(query: string, parameters?: any[]) {
    return this.formationRepository.query(query, parameters);
  }

  createQueryBuilder(alias?: string, queryRunner?: QueryRunner) {
    return this.formationRepository.createQueryBuilder(alias, queryRunner);
  }

  findAll(options?: FindManyOptions): Promise<Formation[]> {
    return this.formationRepository.find(options);
  }
}

import { Injectable } from '@nestjs/common';
import { Formation } from '../../../main/v1/formation/formation.entity';
import { TypeOrmCrudService } from '@nestjsx/crud-typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class FormationService extends TypeOrmCrudService<Formation> {
  constructor(@InjectRepository(Formation) formation) {
    super(formation);
  }
}

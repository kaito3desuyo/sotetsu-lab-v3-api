import { SelectQueryBuilder, Brackets } from 'typeorm';
import moment from 'moment';
import { HttpException, HttpStatus } from '@nestjs/common';

export class QueryBuilderFunctions<T> {
  searchDate = (date: string, qb: SelectQueryBuilder<T>) => {
    if (
      !/\d{4}-\d{2}-\d{2}/.test(date) ||
      !moment(date, 'YYYY-MM-DD').isValid()
    ) {
      throw new HttpException(
        'query `date` has invalid value. example: 2019-01-01',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return qb
      .andWhere(
        new Brackets(subqb => {
          return subqb
            .where('start_date <= :date', {
              date,
            })
            .orWhere('start_date IS NULL');
        }),
      )
      .andWhere(
        new Brackets(subqb => {
          return subqb
            .where(':date <= end_date', {
              date,
            })
            .orWhere('end_date IS NULL');
        }),
      );
  };
}

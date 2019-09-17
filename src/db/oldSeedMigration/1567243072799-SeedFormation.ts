import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { Formation } from '../../main/v1/formation/formation.entity';
import { Agency } from '../../main/v1/agency/agency.entity';
import { find } from 'lodash';
// tslint:disable: max-line-length
export class SeedFormation1567243072799 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    const agencies = await getRepository(Agency).find();

    const formations = formationsSeed.map(formation => {
      return {
        ...formation,
        agency_id: find(agencies, agency => agency.agency_name === '相鉄').id,
      };
    });

    await getRepository(Formation).save(formations);
  }

  // tslint:disable-next-line: no-empty
  public async down(queryRunner: QueryRunner): Promise<any> {}
}

const formationsSeed: Array<Partial<Formation>> = [
  {
    vehicle_type: '7000',
    formation_number: '7707',
    start_date: null,
    end_date: new Date('2019-03-06'),
  },
  {
    vehicle_type: '7000',
    formation_number: '7710',
    start_date: null,
    end_date: new Date('2019-04-28'),
  },
  {
    vehicle_type: '7000',
    formation_number: '7712',
    start_date: null,
    end_date: new Date('2019-04-28'),
  },
  {
    vehicle_type: '7000',
    formation_number: '7710',
    start_date: new Date('2019-04-29'),
    end_date: new Date('2019-05-12'),
  },
  {
    vehicle_type: '7000',
    formation_number: '7712',
    start_date: new Date('2019-04-29'),
    end_date: new Date('2019-05-12'),
  },
  {
    vehicle_type: '7000',
    formation_number: '7710',
    start_date: new Date('2019-05-13'),
    end_date: null,
  },
  {
    vehicle_type: '7000',
    formation_number: '7713',
    start_date: null,
    end_date: null,
  },
  {
    vehicle_type: '7000',
    formation_number: '7715',
    start_date: null,
    end_date: null,
  },
  {
    vehicle_type: '7000',
    formation_number: '7751',
    start_date: null,
    end_date: null,
  },
  {
    vehicle_type: '7000',
    formation_number: '7753',
    start_date: null,
    end_date: null,
  },
  {
    vehicle_type: '7000',
    formation_number: '7754',
    start_date: null,
    end_date: null,
  },
  {
    vehicle_type: '7000',
    formation_number: '7755',
    start_date: null,
    end_date: null,
  },
  {
    vehicle_type: '8000',
    formation_number: '8701',
    start_date: new Date('1990-12-01'),
    end_date: null,
  },
  {
    vehicle_type: '8000',
    formation_number: '8702',
    start_date: new Date('1991-03-01'),
    end_date: null,
  },
  {
    vehicle_type: '8000',
    formation_number: '8703',
    start_date: new Date('1991-03-01'),
    end_date: null,
  },
  {
    vehicle_type: '8000',
    formation_number: '8704',
    start_date: new Date('1992-01-01'),
    end_date: null,
  },
  {
    vehicle_type: '8000',
    formation_number: '8705',
    start_date: new Date('1992-03-01'),
    end_date: null,
  },
  {
    vehicle_type: '8000',
    formation_number: '8706',
    start_date: new Date('1992-03-01'),
    end_date: null,
  },
  {
    vehicle_type: '8000',
    formation_number: '8707',
    start_date: new Date('1993-02-01'),
    end_date: new Date('2006-03-31'),
  },
  {
    vehicle_type: '8000',
    formation_number: '8708',
    start_date: new Date('1994-03-01'),
    end_date: null,
  },
  {
    vehicle_type: '8000',
    formation_number: '8709',
    start_date: new Date('1995-04-01'),
    end_date: null,
  },
  {
    vehicle_type: '8000',
    formation_number: '8710',
    start_date: new Date('1996-03-01'),
    end_date: null,
  },
  {
    vehicle_type: '8000',
    formation_number: '8711',
    start_date: new Date('1997-03-01'),
    end_date: null,
  },
  {
    vehicle_type: '8000',
    formation_number: '8712',
    start_date: new Date('1998-03-01'),
    end_date: null,
  },
  {
    vehicle_type: '8000',
    formation_number: '8713',
    start_date: new Date('1999-09-01'),
    end_date: null,
  },
  {
    vehicle_type: '9000',
    formation_number: '9701',
    start_date: new Date('1993-01-01'),
    end_date: null,
  },
  {
    vehicle_type: '9000',
    formation_number: '9702',
    start_date: new Date('1993-03-01'),
    end_date: null,
  },
  {
    vehicle_type: '9000',
    formation_number: '9703',
    start_date: new Date('1995-03-01'),
    end_date: null,
  },
  {
    vehicle_type: '9000',
    formation_number: '9704',
    start_date: new Date('1996-01-01'),
    end_date: null,
  },
  {
    vehicle_type: '9000',
    formation_number: '9705',
    start_date: new Date('1996-05-01'),
    end_date: null,
  },
  {
    vehicle_type: '9000',
    formation_number: '9706',
    start_date: new Date('1999-02-01'),
    end_date: null,
  },
  {
    vehicle_type: '9000',
    formation_number: '9707',
    start_date: new Date('2001-03-01'),
    end_date: null,
  },
  {
    vehicle_type: '10000',
    formation_number: '10701',
    start_date: new Date('2002-01-01'),
    end_date: null,
  },
  {
    vehicle_type: '10000',
    formation_number: '10702',
    start_date: new Date('2002-03-01'),
    end_date: null,
  },
  {
    vehicle_type: '10000',
    formation_number: '10703',
    start_date: new Date('2003-03-01'),
    end_date: null,
  },
  {
    vehicle_type: '10000',
    formation_number: '10704',
    start_date: new Date('2004-03-01'),
    end_date: null,
  },
  {
    vehicle_type: '10000',
    formation_number: '10705',
    start_date: new Date('2005-01-01'),
    end_date: null,
  },
  {
    vehicle_type: '10000',
    formation_number: '10706',
    start_date: new Date('2005-02-01'),
    end_date: null,
  },
  {
    vehicle_type: '10000',
    formation_number: '10707',
    start_date: new Date('2005-02-01'),
    end_date: null,
  },
  {
    vehicle_type: '10000',
    formation_number: '10708',
    start_date: new Date('2007-03-01'),
    end_date: null,
  },
  {
    vehicle_type: '11000',
    formation_number: '11001',
    start_date: new Date('2009-06-15'),
    end_date: null,
  },
  {
    vehicle_type: '11000',
    formation_number: '11002',
    start_date: new Date('2009-06-15'),
    end_date: null,
  },
  {
    vehicle_type: '11000',
    formation_number: '11003',
    start_date: new Date('2010-03-01'),
    end_date: null,
  },
  {
    vehicle_type: '11000',
    formation_number: '11004',
    start_date: new Date('2011-05-01'),
    end_date: null,
  },
  {
    vehicle_type: '11000',
    formation_number: '11005',
    start_date: new Date('2013-03-01'),
    end_date: null,
  },
  {
    vehicle_type: '20000',
    formation_number: '20101',
    start_date: new Date('2018-02-11'),
    end_date: null,
  },
  {
    vehicle_type: '12000',
    formation_number: '12101',
    start_date: new Date('2019-04-20'),
    end_date: null,
  },
  {
    vehicle_type: '12000',
    formation_number: '12102',
    start_date: new Date('2019-05-11'),
    end_date: null,
  },
  {
    vehicle_type: '12000',
    formation_number: '12103',
    start_date: new Date('2019-06-15'),
    end_date: null,
  },
  {
    vehicle_type: '12000',
    formation_number: '12104',
    start_date: new Date('2019-07-05'),
    end_date: null,
  },
  {
    vehicle_type: '12000',
    formation_number: '12105',
    start_date: new Date('2019-09-13'),
    end_date: null,
  },
];

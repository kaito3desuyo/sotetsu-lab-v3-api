import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { Agency } from '../../main/v1/agency/agency.entity';
// tslint:disable: max-line-length
export class SeedAgency1567227105344 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await getRepository(Agency).save(agenciesSeed);
  }

  // tslint:disable-next-line: no-empty
  public async down(queryRunner: QueryRunner): Promise<any> {}
}

const agenciesSeed: Array<Partial<Agency>> = [
  {
    agency_number: '5020001022615',
    agency_official_name: '相模鉄道株式会社',
    agency_name: '相鉄',
    agency_type: 1,
  },
  {
    agency_number: '9011001029597',
    agency_official_name: '東日本旅客鉄道株式会社',
    agency_name: 'JR東日本',
    agency_type: 1,
  },
];

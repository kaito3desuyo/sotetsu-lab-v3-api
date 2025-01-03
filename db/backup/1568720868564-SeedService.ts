import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { Service } from '../../main/v1/service/service.entity';

export class SeedService1568720868564 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await getRepository(Service).save(servicesSeed);
  }

  // tslint:disable-next-line: no-empty
  public async down(queryRunner: QueryRunner): Promise<any> {}
}

const servicesSeed: Array<Partial<Service>> = [
  {
    service_name: '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
    service_description: null,
  },
];

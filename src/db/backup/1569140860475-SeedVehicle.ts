import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { Vehicle } from '../../main/v1/vehicle/vehicle.entity';

export class SeedVehicle1569140860475 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await getRepository(Vehicle).save(vehiclesSeed);
  }

  // tslint:disable-next-line: no-empty
  public async down(queryRunner: QueryRunner): Promise<any> {}
}

const vehiclesSeed = [
  {
    vehicle_number: '7707',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7131',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7132',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7513',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7605',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7123',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7124',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7508',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7710',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7125',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7126',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7505',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7602',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7107',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7108',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7509',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7712',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7129',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7130',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7607',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7703',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7127',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7128',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7511',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7713',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7149',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7150',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7151',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7152',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7514',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7714',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7153',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7154',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7515',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7715',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7155',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7158',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7516',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7716',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7159',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7160',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7517',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7751',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7351',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7651',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7352',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7551',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7752',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7353',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7652',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7354',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7552',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7753',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7355',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7653',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7356',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7654',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7655',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7357',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7656',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7358',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7553',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7754',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7359',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7657',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7360',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7658',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7659',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7361',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7660',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7362',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7554',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7755',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7363',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7661',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7364',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7662',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7663',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7365',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7664',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7366',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '7555',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8701',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8101',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8201',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8601',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8102',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8202',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8602',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8103',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8203',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8501',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8702',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8104',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8204',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8603',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8105',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8205',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8604',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8106',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8206',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8502',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8703',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8107',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8207',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8605',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8108',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8208',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8606',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8109',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8209',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8503',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8704',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8110',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8210',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8607',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8111',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8211',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8608',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8112',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8212',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8504',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8705',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8113',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8213',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8609',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8114',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8214',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8610',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8115',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8215',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8505',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8706',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8116',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8216',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8611',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8117',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8217',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8612',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8118',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8218',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8506',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8707',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8119',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8219',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8613',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8120',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8220',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8614',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8121',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8221',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8507',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8708',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8122',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8222',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8615',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8123',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8223',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8616',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8124',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8224',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8508',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8709',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8125',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8225',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8617',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8126',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8226',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8618',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8127',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8227',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8509',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8710',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8128',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8228',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8619',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8129',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8229',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8620',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8130',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8230',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8510',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8711',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8131',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8231',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8621',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8132',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8232',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8622',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8133',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8233',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8511',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8712',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8134',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8234',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8623',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8135',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8235',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8624',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8136',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8236',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8512',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8713',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8137',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8237',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8625',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8138',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8238',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8626',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8139',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8239',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '8513',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9701',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9101',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9201',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9601',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9102',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9202',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9602',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9103',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9203',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9501',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9702',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9104',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9204',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9603',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9105',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9205',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9604',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9106',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9206',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9502',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9703',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9107',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9207',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9605',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9108',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9208',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9606',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9109',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9209',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9503',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9704',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9110',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9210',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9607',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9111',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9211',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9608',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9112',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9212',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9504',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9705',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9113',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9213',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9609',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9114',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9214',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9610',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9115',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9215',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9505',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9706',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9116',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9216',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9611',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9117',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9217',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9612',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9118',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9218',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9506',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9707',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9119',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9219',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9613',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9120',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9220',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9614',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9121',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9221',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '9507',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10701',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10201',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10101',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10601',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10301',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10602',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10603',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10202',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10102',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10501',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10702',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10203',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10103',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10604',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10302',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10605',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10606',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10204',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10104',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10502',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10703',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10205',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10105',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10607',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10608',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10206',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10106',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10503',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10704',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10207',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10107',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10609',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10610',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10208',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10108',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10504',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10705',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10209',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10109',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10611',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10612',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10210',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10110',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10505',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10706',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10211',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10111',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10613',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10614',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10212',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10112',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10506',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10707',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10213',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10113',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10615',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10616',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10214',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10114',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10507',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10708',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10215',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10115',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10617',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10303',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10618',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10619',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10216',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10116',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '10508',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11001',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11101',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11201',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11301',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11401',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11501',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11601',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11701',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11801',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11901',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11002',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11102',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11202',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11302',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11402',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11502',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11602',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11702',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11802',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11902',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11003',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11103',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11203',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11303',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11403',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11503',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11603',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11703',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11803',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11903',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11004',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11104',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11204',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11304',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11404',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11504',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11604',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11704',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11804',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11904',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11005',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11105',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11205',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11305',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11405',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11505',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11605',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11705',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11805',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '11905',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '20101',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '20201',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '20301',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '20401',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '20501',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '20601',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '20701',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '20801',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '20901',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '20001',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12101',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12201',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12301',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12401',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12501',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12601',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12701',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12801',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12901',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12001',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12102',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12202',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12302',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12402',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12502',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12602',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12702',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12802',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12902',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12002',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12103',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12203',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12303',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12403',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12503',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12603',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12703',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12803',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12903',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12003',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12104',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12204',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12304',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12404',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12504',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12604',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12704',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12804',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12904',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12004',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12105',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12205',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12305',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12405',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12505',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12605',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12705',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12805',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12905',
    belongs: '相模鉄道かしわ台車両センター',
  },
  {
    vehicle_number: '12005',
    belongs: '相模鉄道かしわ台車両センター',
  },
];

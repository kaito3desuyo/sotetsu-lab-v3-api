import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { TripClass } from '../../main/v1/trip/trip_class.entity';
import { Service } from '../../main/v1/service/service.entity';
import { find } from 'lodash';
// tslint:disable: max-line-length
export class SeedTripClass1567240313532 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    const services = await getRepository(Service).find();

    const classes = tripClassesSeed.map(seed => {
      return {
        ...seed,
        service_id: find(
          services,
          service =>
            service.service_name ===
            '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
        ).id,
      };
    });

    await getRepository(TripClass).save(classes);
  }

  // tslint:disable-next-line: no-empty
  public async down(queryRunner: QueryRunner): Promise<any> {}
}

const tripClassesSeed: Array<Partial<TripClass>> = [
  {
    trip_class_name: '特急',
    trip_class_color: '#ff9800',
    sequence: 1,
  },
  {
    trip_class_name: '通勤特急',
    trip_class_color: '#ffb74d',
    sequence: 2,
  },
  {
    trip_class_name: '急行',
    trip_class_color: '#d50000',
    sequence: 3,
  },
  {
    trip_class_name: '通勤急行',
    trip_class_color: '#ff1744',
    sequence: 4,
  },
  {
    trip_class_name: '快速',
    trip_class_color: '#3f51b5',
    sequence: 5,
  },
  {
    trip_class_name: '各停',
    trip_class_color: '#212121',
    sequence: 6,
  },
  {
    trip_class_name: '回送',
    trip_class_color: '#9e9e9e',
    sequence: 7,
  },
];

import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { Service } from '../../main/v1/service/service.entity';
import { Route } from '../../main/v1/route/route.entity';
import { find } from 'lodash';
import { ServiceToRoute } from '../../main/v1/serviceToRoute/service-to-route.entity';
// tslint:disable: max-line-length
export class SeedServiceToRoute1567228972151 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    const services = await getRepository(Service).find();
    const routes = await getRepository(Route).find();

    const routeSystems = routeSystemsSeed.map(routeSystem => {
      const temp = {
        ...routeSystem,
        service_id: find(
          services,
          service => service.service_name === routeSystem.service_name,
        ).id,
        route_id: find(
          routes,
          route => route.route_name === routeSystem.route_name,
        ).id,
      };
      delete temp.service_name;
      delete temp.route_name;
      return temp;
    });

    await getRepository(ServiceToRoute).save(routeSystems);
  }

  // tslint:disable-next-line: no-empty
  public async down(queryRunner: QueryRunner): Promise<any> {}
}

const routeSystemsSeed = [
  {
    service_name: '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
    route_name: '本線',
    sequence: 4,
  },
  {
    service_name: '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
    route_name: 'いずみ野線',
    sequence: 5,
  },
  {
    service_name: '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
    route_name: '厚木線',
    sequence: 6,
  },
  {
    service_name: '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
    route_name: '新横浜線',
    sequence: 3,
  },
  {
    service_name: '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
    route_name: '埼京線',
    sequence: 2,
  },
  {
    service_name: '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
    route_name: '川越線',
    sequence: 1,
  },
];

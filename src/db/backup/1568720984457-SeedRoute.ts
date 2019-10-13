import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { Agency } from '../../main/v1/agency/agency.entity';
import { filter } from 'lodash';
import { Route } from '../../main/v1/route/route.entity';

export class SeedRoute1568720984457 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    const agencies = await getRepository(Agency).find();

    const routes = [];
    agencies.forEach(agency => {
      const hasRoutes = filter(
        routesSeed,
        route => route.agency_name === agency.agency_name,
      ).map(route => {
        const temp = {
          ...route,
          agency_id: agency.id,
        };
        delete temp.agency_name;

        return temp;
      });

      hasRoutes.forEach(route => routes.push(route));
    });

    await getRepository(Route).save(routes);
  }

  // tslint:disable-next-line: no-empty
  public async down(queryRunner: QueryRunner): Promise<any> {}
}

const routesSeed = [
  {
    agency_name: '相鉄',
    route_number: '4',
    route_name: '本線',
    route_type: 2,
  },
  {
    agency_name: '相鉄',
    route_number: '5',
    route_name: 'いずみ野線',
    route_type: 2,
  },
  {
    agency_name: '相鉄',
    route_number: '6',
    route_name: '厚木線',
    route_type: 2,
  },
  {
    agency_name: '相鉄',
    route_number: '3',
    route_name: '新横浜線',
    route_type: 2,
  },
  {
    agency_name: 'JR東日本',
    route_number: '2',
    route_name: '埼京線',
    route_type: 2,
  },
  {
    agency_name: 'JR東日本',
    route_number: '1',
    route_name: '川越線',
    route_type: 2,
  },
];

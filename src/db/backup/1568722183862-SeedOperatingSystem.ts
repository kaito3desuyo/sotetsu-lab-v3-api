import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { Service } from '../../main/v1/service/service.entity';
import { Route } from '../../main/v1/route/route.entity';
import { find } from 'lodash';
import { OperatingSystem } from '../../main/v1/operating-system/operating-system.entity';

export class SeedOperatingSystem1568722183862 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        const services = await getRepository(Service).find();
        const routesWithStations = await getRepository(Route).find({
            relations: ['route_station_lists', 'route_station_lists.station'],
        });

        const operatingSystems = operatingSystemsSeed.map((operatingSystem) => {
            const route = find(
                routesWithStations,
                (r) => r.route_name === operatingSystem.route_name,
            );

            const temp = {
                ...operatingSystem,
                service_id: find(
                    services,
                    (service) =>
                        service.service_name === operatingSystem.service_name,
                ).id,
                route_id: route.id,
                start_route_station_list_id: find(
                    route.route_station_lists,
                    (rs) =>
                        rs.station.station_name ===
                        operatingSystem.start_station_name,
                ).id,
                end_route_station_list_id: find(
                    route.route_station_lists,
                    (rs) =>
                        rs.station.station_name ===
                        operatingSystem.end_station_name,
                ).id,
            };
            delete temp.service_name;
            delete temp.route_name;
            delete temp.start_station_name;
            delete temp.end_station_name;
            return temp;
        });

        await getRepository(OperatingSystem).save(operatingSystems);
    }

    // tslint:disable-next-line: no-empty
    public async down(queryRunner: QueryRunner): Promise<any> {}
}

const operatingSystemsSeed = [
    {
        service_name:
            '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
        route_name: '本線',
        start_station_name: '横浜',
        end_station_name: '海老名',
        sequence: 5,
    },
    {
        service_name:
            '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
        route_name: 'いずみ野線',
        start_station_name: '二俣川',
        end_station_name: '湘南台',
        sequence: 6,
    },
    {
        service_name:
            '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
        route_name: '厚木線',
        start_station_name: 'かしわ台',
        end_station_name: '厚木',
        sequence: 7,
    },
    {
        service_name:
            '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
        route_name: '新横浜線',
        start_station_name: '羽沢横浜国大',
        end_station_name: '西谷',
        sequence: 4,
    },
    {
        service_name:
            '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
        route_name: '相鉄・JR直通線',
        start_station_name: '大崎',
        end_station_name: '羽沢横浜国大',
        sequence: 3,
    },
    {
        service_name:
            '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
        route_name: '埼京線',
        start_station_name: '大宮',
        end_station_name: '大崎',
        sequence: 2,
    },
    {
        service_name:
            '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
        route_name: '川越線',
        start_station_name: '川越',
        end_station_name: '大宮',
        sequence: 1,
    },
];

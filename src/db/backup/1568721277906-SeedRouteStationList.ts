import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { Route } from '../../main/v1/route/route.entity';
import { Station } from '../../main/v1/station/station.entity';
import { find } from 'lodash';
import { RouteStationList } from '../../main/v1/route-station-list/route-station-list.entity';

export class SeedRouteStationList1568721277906 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    const routes = await getRepository(Route).find();
    const stations = await getRepository(Station).find();

    const routeStations = routeStationListsSeed.map(routeStation => {
      const temp = {
        ...routeStation,
        route_id: find(
          routes,
          route => route.route_name === routeStation.route_name,
        ).id,
        station_id: find(
          stations,
          station => station.station_name === routeStation.station_name,
        ).id,
      };
      delete temp.route_name;
      delete temp.station_name;
      return temp;
    });

    await getRepository(RouteStationList).save(routeStations);
  }

  // tslint:disable-next-line: no-empty
  public async down(queryRunner: QueryRunner): Promise<any> {}
}

const routeStationListsSeed: Array<{
  route_name: string;
  station_name: string;
  station_sequence: number;
  station_numbering: string;
}> = [
  {
    route_name: '本線',
    station_name: '横浜',
    station_sequence: 1,
    station_numbering: 'SO01',
  },
  {
    route_name: '本線',
    station_name: '平沼橋',
    station_sequence: 2,
    station_numbering: 'SO02',
  },
  {
    route_name: '本線',
    station_name: '西横浜',
    station_sequence: 3,
    station_numbering: 'SO03',
  },
  {
    route_name: '本線',
    station_name: '天王町',
    station_sequence: 4,
    station_numbering: 'SO04',
  },
  {
    route_name: '本線',
    station_name: '星川',
    station_sequence: 5,
    station_numbering: 'SO05',
  },
  {
    route_name: '本線',
    station_name: '和田町',
    station_sequence: 6,
    station_numbering: 'SO06',
  },
  {
    route_name: '本線',
    station_name: '上星川',
    station_sequence: 7,
    station_numbering: 'SO07',
  },
  {
    route_name: '本線',
    station_name: '西谷',
    station_sequence: 8,
    station_numbering: 'SO08',
  },
  {
    route_name: '本線',
    station_name: '鶴ヶ峰',
    station_sequence: 9,
    station_numbering: 'SO09',
  },
  {
    route_name: '本線',
    station_name: '二俣川',
    station_sequence: 10,
    station_numbering: 'SO10',
  },
  {
    route_name: '本線',
    station_name: '希望ヶ丘',
    station_sequence: 11,
    station_numbering: 'SO11',
  },
  {
    route_name: '本線',
    station_name: '三ツ境',
    station_sequence: 12,
    station_numbering: 'SO12',
  },
  {
    route_name: '本線',
    station_name: '瀬谷',
    station_sequence: 13,
    station_numbering: 'SO13',
  },
  {
    route_name: '本線',
    station_name: '大和',
    station_sequence: 14,
    station_numbering: 'SO14',
  },
  {
    route_name: '本線',
    station_name: '相模大塚',
    station_sequence: 15,
    station_numbering: 'SO15',
  },
  {
    route_name: '本線',
    station_name: 'さがみ野',
    station_sequence: 16,
    station_numbering: 'SO16',
  },
  {
    route_name: '本線',
    station_name: 'かしわ台',
    station_sequence: 17,
    station_numbering: 'SO17',
  },
  {
    route_name: '本線',
    station_name: '海老名',
    station_sequence: 18,
    station_numbering: 'SO18',
  },
  {
    route_name: 'いずみ野線',
    station_name: '二俣川',
    station_sequence: 1,
    station_numbering: 'SO10',
  },
  {
    route_name: 'いずみ野線',
    station_name: '南万騎が原',
    station_sequence: 2,
    station_numbering: 'SO31',
  },
  {
    route_name: 'いずみ野線',
    station_name: '緑園都市',
    station_sequence: 3,
    station_numbering: 'SO32',
  },
  {
    route_name: 'いずみ野線',
    station_name: '弥生台',
    station_sequence: 4,
    station_numbering: 'SO33',
  },
  {
    route_name: 'いずみ野線',
    station_name: 'いずみ野',
    station_sequence: 5,
    station_numbering: 'SO34',
  },
  {
    route_name: 'いずみ野線',
    station_name: 'いずみ中央',
    station_sequence: 6,
    station_numbering: 'SO35',
  },
  {
    route_name: 'いずみ野線',
    station_name: 'ゆめが丘',
    station_sequence: 7,
    station_numbering: 'SO36',
  },
  {
    route_name: 'いずみ野線',
    station_name: '湘南台',
    station_sequence: 8,
    station_numbering: 'SO37',
  },
  {
    route_name: '厚木線',
    station_name: 'かしわ台',
    station_sequence: 1,
    station_numbering: 'SO17',
  },
  {
    route_name: '厚木線',
    station_name: '厚木',
    station_sequence: 2,
    station_numbering: null,
  },
  {
    route_name: '新横浜線',
    station_name: '西谷',
    station_sequence: 2,
    station_numbering: 'SO08',
  },
  {
    route_name: '新横浜線',
    station_name: '羽沢横浜国大',
    station_sequence: 1,
    station_numbering: 'SO51',
  },
  {
    route_name: '埼京線',
    station_name: '羽沢横浜国大',
    station_sequence: 22,
    station_numbering: 'SO51',
  },
  {
    route_name: '埼京線',
    station_name: '武蔵小杉',
    station_sequence: 21,
    station_numbering: 'JO15,JS15',
  },
  {
    route_name: '埼京線',
    station_name: '西大井',
    station_sequence: 20,
    station_numbering: 'JO16,JS16',
  },
  {
    route_name: '埼京線',
    station_name: '大崎',
    station_sequence: 19,
    station_numbering: 'JS17,JA08',
  },
  {
    route_name: '埼京線',
    station_name: '恵比寿',
    station_sequence: 18,
    station_numbering: 'JA09',
  },
  {
    route_name: '埼京線',
    station_name: '渋谷',
    station_sequence: 17,
    station_numbering: 'JA10',
  },
  {
    route_name: '埼京線',
    station_name: '新宿',
    station_sequence: 16,
    station_numbering: 'JA11',
  },
  {
    route_name: '埼京線',
    station_name: '池袋',
    station_sequence: 15,
    station_numbering: 'JA12',
  },
  {
    route_name: '埼京線',
    station_name: '板橋',
    station_sequence: 14,
    station_numbering: 'JA13',
  },
  {
    route_name: '埼京線',
    station_name: '十条',
    station_sequence: 13,
    station_numbering: 'JA14',
  },
  {
    route_name: '埼京線',
    station_name: '赤羽',
    station_sequence: 12,
    station_numbering: 'JA15',
  },
  {
    route_name: '埼京線',
    station_name: '北赤羽',
    station_sequence: 11,
    station_numbering: 'JA16',
  },
  {
    route_name: '埼京線',
    station_name: '浮間船渡',
    station_sequence: 10,
    station_numbering: 'JA17',
  },
  {
    route_name: '埼京線',
    station_name: '戸田公園',
    station_sequence: 9,
    station_numbering: 'JA18',
  },
  {
    route_name: '埼京線',
    station_name: '戸田',
    station_sequence: 8,
    station_numbering: 'JA19',
  },
  {
    route_name: '埼京線',
    station_name: '北戸田',
    station_sequence: 7,
    station_numbering: 'JA20',
  },
  {
    route_name: '埼京線',
    station_name: '武蔵浦和',
    station_sequence: 6,
    station_numbering: 'JA21',
  },
  {
    route_name: '埼京線',
    station_name: '中浦和',
    station_sequence: 5,
    station_numbering: 'JA22',
  },
  {
    route_name: '埼京線',
    station_name: '南与野',
    station_sequence: 4,
    station_numbering: 'JA23',
  },
  {
    route_name: '埼京線',
    station_name: '与野本町',
    station_sequence: 3,
    station_numbering: 'JA24',
  },
  {
    route_name: '埼京線',
    station_name: '北与野',
    station_sequence: 2,
    station_numbering: 'JA25',
  },
  {
    route_name: '埼京線',
    station_name: '大宮',
    station_sequence: 1,
    station_numbering: 'JA26',
  },
  {
    route_name: '川越線',
    station_name: '大宮',
    station_sequence: 6,
    station_numbering: 'JA26',
  },
  {
    route_name: '川越線',
    station_name: '日進',
    station_sequence: 5,
    station_numbering: null,
  },
  {
    route_name: '川越線',
    station_name: '西大宮',
    station_sequence: 4,
    station_numbering: null,
  },
  {
    route_name: '川越線',
    station_name: '指扇',
    station_sequence: 3,
    station_numbering: null,
  },
  {
    route_name: '川越線',
    station_name: '南古谷',
    station_sequence: 2,
    station_numbering: null,
  },
  {
    route_name: '川越線',
    station_name: '川越',
    station_sequence: 1,
    station_numbering: null,
  },
];

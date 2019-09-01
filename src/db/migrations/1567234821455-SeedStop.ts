import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { Stop } from '../../main/v1/stop/stop.entity';
import { Station } from '../../main/v1/station/station.entity';
import { find } from 'lodash';
// tslint:disable: max-line-length
export class SeedStop1567234821455 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    const stations = await getRepository(Station).find();

    const stops = [];

    stopsSeed.forEach(seed => {
      const temp = seed.stops.map(obj => {
        return {
          ...obj,
          station_id: find(
            stations,
            station => station.station_name === seed.station_name,
          ).id,
        };
      });
      temp.forEach(tmp => stops.push(tmp));
    });

    await getRepository(Stop).save(stops);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {}
}

const stopsSeed: { station_name: string; stops: Partial<Stop>[] }[] = [
  {
    station_name: '横浜',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
      {
        stop_name: '3番線',
      },
    ],
  },
  {
    station_name: '平沼橋',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '西横浜',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '天王町',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '星川',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
      {
        stop_name: '3番線',
      },
      {
        stop_name: '4番線',
      },
    ],
  },
  {
    station_name: '和田町',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '上星川',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '西谷',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
      {
        stop_name: '3番線',
      },
      {
        stop_name: '4番線',
      },
    ],
  },
  {
    station_name: '鶴ヶ峰',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '二俣川',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
      {
        stop_name: '3番線',
      },
      {
        stop_name: '4番線',
      },
    ],
  },
  {
    station_name: '希望ヶ丘',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '三ツ境',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '瀬谷',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
      {
        stop_name: '3番線',
      },
      {
        stop_name: '4番線',
      },
    ],
  },
  {
    station_name: '大和',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '相模大塚',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: 'さがみ野',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: 'かしわ台',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
      {
        stop_name: '3番線',
      },
      {
        stop_name: '4番線',
      },
    ],
  },
  {
    station_name: '海老名',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '南万騎が原',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '緑園都市',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '弥生台',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: 'いずみ野',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
      {
        stop_name: '3番線',
      },
      {
        stop_name: '4番線',
      },
    ],
  },
  {
    station_name: 'いずみ中央',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: 'ゆめが丘',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '湘南台',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '厚木',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '羽沢横浜国大',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '武蔵小杉',
    stops: [
      {
        stop_name: '3番線',
      },
      {
        stop_name: '4番線',
      },
    ],
  },
  {
    station_name: '西大井',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '大崎',
    stops: [
      {
        stop_name: '5番線',
      },
      {
        stop_name: '6番線',
      },
      {
        stop_name: '7番線',
      },
      {
        stop_name: '8番線',
      },
    ],
  },
  {
    station_name: '恵比寿',
    stops: [
      {
        stop_name: '3番線',
      },
      {
        stop_name: '4番線',
      },
    ],
  },
  {
    station_name: '渋谷',
    stops: [
      {
        stop_name: '3番線',
      },
      {
        stop_name: '4番線',
      },
    ],
  },
  {
    station_name: '新宿',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
      {
        stop_name: '3番線',
      },
      {
        stop_name: '4番線',
      },
    ],
  },
  {
    station_name: '池袋',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
      {
        stop_name: '3番線',
      },
      {
        stop_name: '4番線',
      },
    ],
  },
  {
    station_name: '板橋',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '十条',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '赤羽',
    stops: [
      {
        stop_name: '7番線',
      },
      {
        stop_name: '8番線',
      },
    ],
  },
  {
    station_name: '北赤羽',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '浮間船渡',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '戸田公園',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '戸田',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '北戸田',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '武蔵浦和',
    stops: [
      {
        stop_name: '3番線',
      },
      {
        stop_name: '4番線',
      },
      {
        stop_name: '5番線',
      },
      {
        stop_name: '6番線',
      },
    ],
  },
  {
    station_name: '中浦和',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '南与野',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '与野本町',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '北与野',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '大宮',
    stops: [
      {
        stop_name: '19番線',
      },
      {
        stop_name: '20番線',
      },
      {
        stop_name: '21番線',
      },
      {
        stop_name: '22番線',
      },
    ],
  },
  {
    station_name: '日進',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '西大宮',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '指扇',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
    ],
  },
  {
    station_name: '南古谷',
    stops: [
      {
        stop_name: '1番線',
      },
      {
        stop_name: '2番線',
      },
      {
        stop_name: '3番線',
      },
    ],
  },
  {
    station_name: '川越',
    stops: [
      {
        stop_name: '3番線',
      },
      {
        stop_name: '4番線',
      },
      {
        stop_name: '5番線',
      },
      {
        stop_name: '6番線',
      },
    ],
  },
];

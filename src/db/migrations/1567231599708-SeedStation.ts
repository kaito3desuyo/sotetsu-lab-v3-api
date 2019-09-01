import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { Station } from '../../main/v1/station/station.entity';
// tslint:disable: max-line-length
export class SeedStation1567231599708 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await getRepository(Station).save(stationsSeed);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {}
}

const stationsSeed: Partial<Station>[] = [
  {
    station_name: '横浜',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '平沼橋',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '西横浜',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '天王町',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '星川',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '和田町',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '上星川',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '西谷',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '鶴ヶ峰',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '二俣川',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '希望ヶ丘',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '三ツ境',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '瀬谷',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '大和',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '相模大塚',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: 'さがみ野',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: 'かしわ台',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '海老名',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '南万騎が原',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '緑園都市',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '弥生台',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: 'いずみ野',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: 'いずみ中央',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: 'ゆめが丘',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '湘南台',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '厚木',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '羽沢横浜国大',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '武蔵小杉',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '西大井',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '大崎',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '恵比寿',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '渋谷',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '新宿',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '池袋',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '板橋',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '十条',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '赤羽',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '北赤羽',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '浮間船渡',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '戸田公園',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '戸田',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '北戸田',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '武蔵浦和',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '中浦和',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '南与野',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '与野本町',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '北与野',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '大宮',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '日進',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '西大宮',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '指扇',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '南古谷',
    station_type: 1,
    wheelchair_boarding: true,
  },
  {
    station_name: '川越',
    station_type: 1,
    wheelchair_boarding: true,
  },
];

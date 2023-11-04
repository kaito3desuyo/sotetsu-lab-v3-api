import {
  MigrationInterface,
  QueryRunner,
  DeepPartial,
  getRepository,
} from 'typeorm';
import { Formation } from '../../main/v1/formation/formation.entity';
import { Agency } from '../../main/v1/agency/agency.entity';
import { find } from 'lodash';
import { Vehicle } from '../../main/v1/vehicle/vehicle.entity';
import { VehicleFormation } from '../../main/v1/vehicle-formation/vehicle-formation.entity';

export class SeedFormationAndVehicleJRE2331573893239701
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    const agencies = await getRepository(Agency).find();

    const formations = formationsSeed.map(formation => {
      return {
        ...formation,
        agency_id: find(agencies, agency => agency.agency_name === 'JR東日本')
          .id,
      };
    });

    const resultOfFormations = await getRepository(Formation).save(formations);

    const resultOfVehicles = await getRepository(Vehicle).save(vehiclesSeed);

    const vehicleFormations = vehicleFormationsSeed.map(vf => {
      return {
        formation_id: find(
          resultOfFormations,
          f => f.formation_number === vf.formation.formation_number,
        ).id,
        vehicle_id: find(
          resultOfVehicles,
          v => v.vehicle_number === vf.vehicle.vehicle_number,
        ).id,
        car_number: vf.car_number,
      };
    });

    await getRepository(VehicleFormation).save(vehicleFormations);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {}
}

const formationsSeed: Array<DeepPartial<Formation>> = [
  {
    vehicle_type: 'E233-7000',
    formation_number: '101',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '102',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '103',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '104',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '105',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '106',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '107',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '108',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '109',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '110',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '111',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '112',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '113',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '114',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '115',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '116',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '117',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '118',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '119',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '120',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '121',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '122',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '123',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '124',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '125',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '126',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '127',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '128',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '129',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '130',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '131',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '132',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '133',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '134',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '135',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '136',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '137',
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    vehicle_type: 'E233-7000',
    formation_number: '138',
    start_date: '2019-11-30',
    end_date: null,
  },
];

const vehiclesSeed: Array<DeepPartial<Vehicle>> = [
  {
    vehicle_number: 'クハE233-7001',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7401',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7401',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7201',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7001',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7001',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7001',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7201',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7201',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7001',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7002',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7402',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7402',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7202',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7002',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7002',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7002',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7202',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7202',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7002',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7003',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7403',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7403',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7203',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7003',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7003',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7003',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7203',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7203',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7003',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7004',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7404',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7404',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7204',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7004',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7004',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7004',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7204',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7204',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7004',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7005',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7405',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7405',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7205',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7005',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7005',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7005',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7205',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7205',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7005',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7006',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7406',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7406',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7206',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7006',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7006',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7006',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7206',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7206',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7006',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7007',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7407',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7407',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7207',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7007',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7007',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7007',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7207',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7207',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7007',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7008',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7408',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7408',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7208',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7008',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7008',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7008',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7208',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7208',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7008',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7009',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7409',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7409',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7209',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7009',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7009',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7009',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7209',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7209',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7009',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7010',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7410',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7410',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7210',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7010',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7010',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7010',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7210',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7210',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7010',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7011',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7411',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7411',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7211',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7011',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7011',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7011',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7211',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7211',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7011',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7012',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7412',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7412',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7212',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7012',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7012',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7012',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7212',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7212',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7012',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7013',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7413',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7413',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7213',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7013',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7013',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7013',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7213',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7213',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7013',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7014',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7414',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7414',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7214',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7014',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7014',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7014',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7214',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7214',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7014',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7015',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7415',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7415',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7215',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7015',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7015',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7015',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7215',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7215',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7015',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7016',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7416',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7416',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7216',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7016',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7016',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7016',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7216',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7216',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7016',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7017',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7417',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7417',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7217',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7017',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7017',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7017',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7217',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7217',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7017',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7018',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7418',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7418',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7218',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7018',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7018',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7018',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7218',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7218',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7018',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7019',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7419',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7419',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7219',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7019',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7019',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7019',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7219',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7219',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7019',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7020',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7420',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7420',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7220',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7020',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7020',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7020',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7220',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7220',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7020',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7021',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7421',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7421',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7221',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7021',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7021',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7021',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7221',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7221',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7021',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7022',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7422',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7422',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7222',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7022',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7022',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7022',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7222',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7222',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7022',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7023',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7423',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7423',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7223',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7023',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7023',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7023',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7223',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7223',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7023',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7024',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7424',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7424',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7224',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7024',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7024',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7024',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7224',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7224',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7024',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7025',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7425',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7425',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7225',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7025',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7025',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7025',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7225',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7225',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7025',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7026',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7426',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7426',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7226',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7026',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7026',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7026',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7226',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7226',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7026',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7027',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7427',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7427',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7227',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7027',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7027',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7027',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7227',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7227',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7027',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7028',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7428',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7428',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7228',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7028',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7028',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7028',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7228',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7228',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7028',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7029',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7429',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7429',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7229',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7029',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7029',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7029',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7229',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7229',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7029',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7030',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7430',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7430',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7230',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7030',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7030',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7030',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7230',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7230',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7030',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7031',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7431',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7431',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7231',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7031',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7031',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7031',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7231',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7231',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7031',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7032',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7432',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7432',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7232',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7032',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7032',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7032',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7232',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7232',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7032',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7033',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7433',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7433',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7233',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7033',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7033',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7033',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7233',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7233',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7033',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7034',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7434',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7434',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7234',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7034',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7034',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7034',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7234',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7234',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7034',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7035',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7435',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7435',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7235',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7035',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7035',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7035',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7235',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7235',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7035',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7036',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7436',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7436',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7236',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7036',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7036',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7036',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7236',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7236',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7036',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7037',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7437',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7437',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7237',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7037',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7037',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7037',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7237',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7237',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7037',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  ///////////////////////////////////////////////////
  {
    vehicle_number: 'クハE233-7038',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7438',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7438',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7238',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'サハE233-7038',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7038',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7038',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE233-7238',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'モハE232-7238',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
  {
    vehicle_number: 'クハE232-7038',
    belongs: '東日本旅客鉄道大宮支社川越車両センター',
  },
];

const vehicleFormationsSeed: Array<DeepPartial<VehicleFormation>> = [
  {
    formation: {
      formation_number: '101',
    },
    vehicle: {
      vehicle_number: 'クハE233-7001',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '101',
    },
    vehicle: {
      vehicle_number: 'モハE233-7401',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '101',
    },
    vehicle: {
      vehicle_number: 'モハE232-7401',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '101',
    },
    vehicle: {
      vehicle_number: 'サハE233-7201',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '101',
    },
    vehicle: {
      vehicle_number: 'サハE233-7001',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '101',
    },
    vehicle: {
      vehicle_number: 'モハE233-7001',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '101',
    },
    vehicle: {
      vehicle_number: 'モハE232-7001',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '101',
    },
    vehicle: {
      vehicle_number: 'モハE233-7201',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '101',
    },
    vehicle: {
      vehicle_number: 'モハE232-7201',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '101',
    },
    vehicle: {
      vehicle_number: 'クハE232-7001',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '102',
    },
    vehicle: {
      vehicle_number: 'クハE233-7002',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '102',
    },
    vehicle: {
      vehicle_number: 'モハE233-7402',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '102',
    },
    vehicle: {
      vehicle_number: 'モハE232-7402',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '102',
    },
    vehicle: {
      vehicle_number: 'サハE233-7202',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '102',
    },
    vehicle: {
      vehicle_number: 'サハE233-7002',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '102',
    },
    vehicle: {
      vehicle_number: 'モハE233-7002',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '102',
    },
    vehicle: {
      vehicle_number: 'モハE232-7002',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '102',
    },
    vehicle: {
      vehicle_number: 'モハE233-7202',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '102',
    },
    vehicle: {
      vehicle_number: 'モハE232-7202',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '102',
    },
    vehicle: {
      vehicle_number: 'クハE232-7002',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '103',
    },
    vehicle: {
      vehicle_number: 'クハE233-7003',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '103',
    },
    vehicle: {
      vehicle_number: 'モハE233-7403',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '103',
    },
    vehicle: {
      vehicle_number: 'モハE232-7403',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '103',
    },
    vehicle: {
      vehicle_number: 'サハE233-7203',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '103',
    },
    vehicle: {
      vehicle_number: 'サハE233-7003',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '103',
    },
    vehicle: {
      vehicle_number: 'モハE233-7003',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '103',
    },
    vehicle: {
      vehicle_number: 'モハE232-7003',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '103',
    },
    vehicle: {
      vehicle_number: 'モハE233-7203',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '103',
    },
    vehicle: {
      vehicle_number: 'モハE232-7203',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '103',
    },
    vehicle: {
      vehicle_number: 'クハE232-7003',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '104',
    },
    vehicle: {
      vehicle_number: 'クハE233-7004',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '104',
    },
    vehicle: {
      vehicle_number: 'モハE233-7404',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '104',
    },
    vehicle: {
      vehicle_number: 'モハE232-7404',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '104',
    },
    vehicle: {
      vehicle_number: 'サハE233-7204',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '104',
    },
    vehicle: {
      vehicle_number: 'サハE233-7004',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '104',
    },
    vehicle: {
      vehicle_number: 'モハE233-7004',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '104',
    },
    vehicle: {
      vehicle_number: 'モハE232-7004',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '104',
    },
    vehicle: {
      vehicle_number: 'モハE233-7204',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '104',
    },
    vehicle: {
      vehicle_number: 'モハE232-7204',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '104',
    },
    vehicle: {
      vehicle_number: 'クハE232-7004',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '105',
    },
    vehicle: {
      vehicle_number: 'クハE233-7005',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '105',
    },
    vehicle: {
      vehicle_number: 'モハE233-7405',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '105',
    },
    vehicle: {
      vehicle_number: 'モハE232-7405',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '105',
    },
    vehicle: {
      vehicle_number: 'サハE233-7205',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '105',
    },
    vehicle: {
      vehicle_number: 'サハE233-7005',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '105',
    },
    vehicle: {
      vehicle_number: 'モハE233-7005',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '105',
    },
    vehicle: {
      vehicle_number: 'モハE232-7005',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '105',
    },
    vehicle: {
      vehicle_number: 'モハE233-7205',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '105',
    },
    vehicle: {
      vehicle_number: 'モハE232-7205',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '105',
    },
    vehicle: {
      vehicle_number: 'クハE232-7005',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '106',
    },
    vehicle: {
      vehicle_number: 'クハE233-7006',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '106',
    },
    vehicle: {
      vehicle_number: 'モハE233-7406',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '106',
    },
    vehicle: {
      vehicle_number: 'モハE232-7406',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '106',
    },
    vehicle: {
      vehicle_number: 'サハE233-7206',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '106',
    },
    vehicle: {
      vehicle_number: 'サハE233-7006',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '106',
    },
    vehicle: {
      vehicle_number: 'モハE233-7006',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '106',
    },
    vehicle: {
      vehicle_number: 'モハE232-7006',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '106',
    },
    vehicle: {
      vehicle_number: 'モハE233-7206',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '106',
    },
    vehicle: {
      vehicle_number: 'モハE232-7206',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '106',
    },
    vehicle: {
      vehicle_number: 'クハE232-7006',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '107',
    },
    vehicle: {
      vehicle_number: 'クハE233-7007',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '107',
    },
    vehicle: {
      vehicle_number: 'モハE233-7407',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '107',
    },
    vehicle: {
      vehicle_number: 'モハE232-7407',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '107',
    },
    vehicle: {
      vehicle_number: 'サハE233-7207',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '107',
    },
    vehicle: {
      vehicle_number: 'サハE233-7007',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '107',
    },
    vehicle: {
      vehicle_number: 'モハE233-7007',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '107',
    },
    vehicle: {
      vehicle_number: 'モハE232-7007',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '107',
    },
    vehicle: {
      vehicle_number: 'モハE233-7207',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '107',
    },
    vehicle: {
      vehicle_number: 'モハE232-7207',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '107',
    },
    vehicle: {
      vehicle_number: 'クハE232-7007',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '108',
    },
    vehicle: {
      vehicle_number: 'クハE233-7008',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '108',
    },
    vehicle: {
      vehicle_number: 'モハE233-7408',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '108',
    },
    vehicle: {
      vehicle_number: 'モハE232-7408',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '108',
    },
    vehicle: {
      vehicle_number: 'サハE233-7208',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '108',
    },
    vehicle: {
      vehicle_number: 'サハE233-7008',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '108',
    },
    vehicle: {
      vehicle_number: 'モハE233-7008',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '108',
    },
    vehicle: {
      vehicle_number: 'モハE232-7008',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '108',
    },
    vehicle: {
      vehicle_number: 'モハE233-7208',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '108',
    },
    vehicle: {
      vehicle_number: 'モハE232-7208',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '108',
    },
    vehicle: {
      vehicle_number: 'クハE232-7008',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '109',
    },
    vehicle: {
      vehicle_number: 'クハE233-7009',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '109',
    },
    vehicle: {
      vehicle_number: 'モハE233-7409',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '109',
    },
    vehicle: {
      vehicle_number: 'モハE232-7409',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '109',
    },
    vehicle: {
      vehicle_number: 'サハE233-7209',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '109',
    },
    vehicle: {
      vehicle_number: 'サハE233-7009',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '109',
    },
    vehicle: {
      vehicle_number: 'モハE233-7009',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '109',
    },
    vehicle: {
      vehicle_number: 'モハE232-7009',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '109',
    },
    vehicle: {
      vehicle_number: 'モハE233-7209',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '109',
    },
    vehicle: {
      vehicle_number: 'モハE232-7209',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '109',
    },
    vehicle: {
      vehicle_number: 'クハE232-7009',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '110',
    },
    vehicle: {
      vehicle_number: 'クハE233-7010',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '110',
    },
    vehicle: {
      vehicle_number: 'モハE233-7410',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '110',
    },
    vehicle: {
      vehicle_number: 'モハE232-7410',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '110',
    },
    vehicle: {
      vehicle_number: 'サハE233-7210',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '110',
    },
    vehicle: {
      vehicle_number: 'サハE233-7010',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '110',
    },
    vehicle: {
      vehicle_number: 'モハE233-7010',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '110',
    },
    vehicle: {
      vehicle_number: 'モハE232-7010',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '110',
    },
    vehicle: {
      vehicle_number: 'モハE233-7210',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '110',
    },
    vehicle: {
      vehicle_number: 'モハE232-7210',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '110',
    },
    vehicle: {
      vehicle_number: 'クハE232-7010',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '111',
    },
    vehicle: {
      vehicle_number: 'クハE233-7011',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '111',
    },
    vehicle: {
      vehicle_number: 'モハE233-7411',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '111',
    },
    vehicle: {
      vehicle_number: 'モハE232-7411',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '111',
    },
    vehicle: {
      vehicle_number: 'サハE233-7211',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '111',
    },
    vehicle: {
      vehicle_number: 'サハE233-7011',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '111',
    },
    vehicle: {
      vehicle_number: 'モハE233-7011',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '111',
    },
    vehicle: {
      vehicle_number: 'モハE232-7011',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '111',
    },
    vehicle: {
      vehicle_number: 'モハE233-7211',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '111',
    },
    vehicle: {
      vehicle_number: 'モハE232-7211',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '111',
    },
    vehicle: {
      vehicle_number: 'クハE232-7011',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '112',
    },
    vehicle: {
      vehicle_number: 'クハE233-7012',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '112',
    },
    vehicle: {
      vehicle_number: 'モハE233-7412',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '112',
    },
    vehicle: {
      vehicle_number: 'モハE232-7412',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '112',
    },
    vehicle: {
      vehicle_number: 'サハE233-7212',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '112',
    },
    vehicle: {
      vehicle_number: 'サハE233-7012',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '112',
    },
    vehicle: {
      vehicle_number: 'モハE233-7012',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '112',
    },
    vehicle: {
      vehicle_number: 'モハE232-7012',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '112',
    },
    vehicle: {
      vehicle_number: 'モハE233-7212',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '112',
    },
    vehicle: {
      vehicle_number: 'モハE232-7212',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '112',
    },
    vehicle: {
      vehicle_number: 'クハE232-7012',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '113',
    },
    vehicle: {
      vehicle_number: 'クハE233-7013',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '113',
    },
    vehicle: {
      vehicle_number: 'モハE233-7413',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '113',
    },
    vehicle: {
      vehicle_number: 'モハE232-7413',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '113',
    },
    vehicle: {
      vehicle_number: 'サハE233-7213',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '113',
    },
    vehicle: {
      vehicle_number: 'サハE233-7013',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '113',
    },
    vehicle: {
      vehicle_number: 'モハE233-7013',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '113',
    },
    vehicle: {
      vehicle_number: 'モハE232-7013',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '113',
    },
    vehicle: {
      vehicle_number: 'モハE233-7213',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '113',
    },
    vehicle: {
      vehicle_number: 'モハE232-7213',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '113',
    },
    vehicle: {
      vehicle_number: 'クハE232-7013',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '114',
    },
    vehicle: {
      vehicle_number: 'クハE233-7014',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '114',
    },
    vehicle: {
      vehicle_number: 'モハE233-7414',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '114',
    },
    vehicle: {
      vehicle_number: 'モハE232-7414',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '114',
    },
    vehicle: {
      vehicle_number: 'サハE233-7214',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '114',
    },
    vehicle: {
      vehicle_number: 'サハE233-7014',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '114',
    },
    vehicle: {
      vehicle_number: 'モハE233-7014',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '114',
    },
    vehicle: {
      vehicle_number: 'モハE232-7014',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '114',
    },
    vehicle: {
      vehicle_number: 'モハE233-7214',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '114',
    },
    vehicle: {
      vehicle_number: 'モハE232-7214',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '114',
    },
    vehicle: {
      vehicle_number: 'クハE232-7014',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '115',
    },
    vehicle: {
      vehicle_number: 'クハE233-7015',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '115',
    },
    vehicle: {
      vehicle_number: 'モハE233-7415',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '115',
    },
    vehicle: {
      vehicle_number: 'モハE232-7415',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '115',
    },
    vehicle: {
      vehicle_number: 'サハE233-7215',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '115',
    },
    vehicle: {
      vehicle_number: 'サハE233-7015',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '115',
    },
    vehicle: {
      vehicle_number: 'モハE233-7015',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '115',
    },
    vehicle: {
      vehicle_number: 'モハE232-7015',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '115',
    },
    vehicle: {
      vehicle_number: 'モハE233-7215',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '115',
    },
    vehicle: {
      vehicle_number: 'モハE232-7215',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '115',
    },
    vehicle: {
      vehicle_number: 'クハE232-7015',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '116',
    },
    vehicle: {
      vehicle_number: 'クハE233-7016',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '116',
    },
    vehicle: {
      vehicle_number: 'モハE233-7416',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '116',
    },
    vehicle: {
      vehicle_number: 'モハE232-7416',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '116',
    },
    vehicle: {
      vehicle_number: 'サハE233-7216',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '116',
    },
    vehicle: {
      vehicle_number: 'サハE233-7016',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '116',
    },
    vehicle: {
      vehicle_number: 'モハE233-7016',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '116',
    },
    vehicle: {
      vehicle_number: 'モハE232-7016',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '116',
    },
    vehicle: {
      vehicle_number: 'モハE233-7216',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '116',
    },
    vehicle: {
      vehicle_number: 'モハE232-7216',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '116',
    },
    vehicle: {
      vehicle_number: 'クハE232-7016',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '117',
    },
    vehicle: {
      vehicle_number: 'クハE233-7017',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '117',
    },
    vehicle: {
      vehicle_number: 'モハE233-7417',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '117',
    },
    vehicle: {
      vehicle_number: 'モハE232-7417',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '117',
    },
    vehicle: {
      vehicle_number: 'サハE233-7217',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '117',
    },
    vehicle: {
      vehicle_number: 'サハE233-7017',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '117',
    },
    vehicle: {
      vehicle_number: 'モハE233-7017',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '117',
    },
    vehicle: {
      vehicle_number: 'モハE232-7017',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '117',
    },
    vehicle: {
      vehicle_number: 'モハE233-7217',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '117',
    },
    vehicle: {
      vehicle_number: 'モハE232-7217',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '117',
    },
    vehicle: {
      vehicle_number: 'クハE232-7017',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '118',
    },
    vehicle: {
      vehicle_number: 'クハE233-7018',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '118',
    },
    vehicle: {
      vehicle_number: 'モハE233-7418',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '118',
    },
    vehicle: {
      vehicle_number: 'モハE232-7418',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '118',
    },
    vehicle: {
      vehicle_number: 'サハE233-7218',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '118',
    },
    vehicle: {
      vehicle_number: 'サハE233-7018',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '118',
    },
    vehicle: {
      vehicle_number: 'モハE233-7018',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '118',
    },
    vehicle: {
      vehicle_number: 'モハE232-7018',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '118',
    },
    vehicle: {
      vehicle_number: 'モハE233-7218',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '118',
    },
    vehicle: {
      vehicle_number: 'モハE232-7218',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '118',
    },
    vehicle: {
      vehicle_number: 'クハE232-7018',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '119',
    },
    vehicle: {
      vehicle_number: 'クハE233-7019',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '119',
    },
    vehicle: {
      vehicle_number: 'モハE233-7419',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '119',
    },
    vehicle: {
      vehicle_number: 'モハE232-7419',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '119',
    },
    vehicle: {
      vehicle_number: 'サハE233-7219',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '119',
    },
    vehicle: {
      vehicle_number: 'サハE233-7019',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '119',
    },
    vehicle: {
      vehicle_number: 'モハE233-7019',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '119',
    },
    vehicle: {
      vehicle_number: 'モハE232-7019',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '119',
    },
    vehicle: {
      vehicle_number: 'モハE233-7219',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '119',
    },
    vehicle: {
      vehicle_number: 'モハE232-7219',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '119',
    },
    vehicle: {
      vehicle_number: 'クハE232-7019',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '120',
    },
    vehicle: {
      vehicle_number: 'クハE233-7020',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '120',
    },
    vehicle: {
      vehicle_number: 'モハE233-7420',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '120',
    },
    vehicle: {
      vehicle_number: 'モハE232-7420',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '120',
    },
    vehicle: {
      vehicle_number: 'サハE233-7220',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '120',
    },
    vehicle: {
      vehicle_number: 'サハE233-7020',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '120',
    },
    vehicle: {
      vehicle_number: 'モハE233-7020',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '120',
    },
    vehicle: {
      vehicle_number: 'モハE232-7020',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '120',
    },
    vehicle: {
      vehicle_number: 'モハE233-7220',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '120',
    },
    vehicle: {
      vehicle_number: 'モハE232-7220',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '120',
    },
    vehicle: {
      vehicle_number: 'クハE232-7020',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '121',
    },
    vehicle: {
      vehicle_number: 'クハE233-7021',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '121',
    },
    vehicle: {
      vehicle_number: 'モハE233-7421',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '121',
    },
    vehicle: {
      vehicle_number: 'モハE232-7421',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '121',
    },
    vehicle: {
      vehicle_number: 'サハE233-7221',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '121',
    },
    vehicle: {
      vehicle_number: 'サハE233-7021',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '121',
    },
    vehicle: {
      vehicle_number: 'モハE233-7021',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '121',
    },
    vehicle: {
      vehicle_number: 'モハE232-7021',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '121',
    },
    vehicle: {
      vehicle_number: 'モハE233-7221',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '121',
    },
    vehicle: {
      vehicle_number: 'モハE232-7221',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '121',
    },
    vehicle: {
      vehicle_number: 'クハE232-7021',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '122',
    },
    vehicle: {
      vehicle_number: 'クハE233-7022',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '122',
    },
    vehicle: {
      vehicle_number: 'モハE233-7422',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '122',
    },
    vehicle: {
      vehicle_number: 'モハE232-7422',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '122',
    },
    vehicle: {
      vehicle_number: 'サハE233-7222',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '122',
    },
    vehicle: {
      vehicle_number: 'サハE233-7022',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '122',
    },
    vehicle: {
      vehicle_number: 'モハE233-7022',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '122',
    },
    vehicle: {
      vehicle_number: 'モハE232-7022',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '122',
    },
    vehicle: {
      vehicle_number: 'モハE233-7222',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '122',
    },
    vehicle: {
      vehicle_number: 'モハE232-7222',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '122',
    },
    vehicle: {
      vehicle_number: 'クハE232-7022',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '123',
    },
    vehicle: {
      vehicle_number: 'クハE233-7023',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '123',
    },
    vehicle: {
      vehicle_number: 'モハE233-7423',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '123',
    },
    vehicle: {
      vehicle_number: 'モハE232-7423',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '123',
    },
    vehicle: {
      vehicle_number: 'サハE233-7223',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '123',
    },
    vehicle: {
      vehicle_number: 'サハE233-7023',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '123',
    },
    vehicle: {
      vehicle_number: 'モハE233-7023',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '123',
    },
    vehicle: {
      vehicle_number: 'モハE232-7023',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '123',
    },
    vehicle: {
      vehicle_number: 'モハE233-7223',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '123',
    },
    vehicle: {
      vehicle_number: 'モハE232-7223',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '123',
    },
    vehicle: {
      vehicle_number: 'クハE232-7023',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '124',
    },
    vehicle: {
      vehicle_number: 'クハE233-7024',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '124',
    },
    vehicle: {
      vehicle_number: 'モハE233-7424',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '124',
    },
    vehicle: {
      vehicle_number: 'モハE232-7424',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '124',
    },
    vehicle: {
      vehicle_number: 'サハE233-7224',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '124',
    },
    vehicle: {
      vehicle_number: 'サハE233-7024',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '124',
    },
    vehicle: {
      vehicle_number: 'モハE233-7024',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '124',
    },
    vehicle: {
      vehicle_number: 'モハE232-7024',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '124',
    },
    vehicle: {
      vehicle_number: 'モハE233-7224',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '124',
    },
    vehicle: {
      vehicle_number: 'モハE232-7224',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '124',
    },
    vehicle: {
      vehicle_number: 'クハE232-7024',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '125',
    },
    vehicle: {
      vehicle_number: 'クハE233-7025',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '125',
    },
    vehicle: {
      vehicle_number: 'モハE233-7425',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '125',
    },
    vehicle: {
      vehicle_number: 'モハE232-7425',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '125',
    },
    vehicle: {
      vehicle_number: 'サハE233-7225',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '125',
    },
    vehicle: {
      vehicle_number: 'サハE233-7025',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '125',
    },
    vehicle: {
      vehicle_number: 'モハE233-7025',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '125',
    },
    vehicle: {
      vehicle_number: 'モハE232-7025',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '125',
    },
    vehicle: {
      vehicle_number: 'モハE233-7225',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '125',
    },
    vehicle: {
      vehicle_number: 'モハE232-7225',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '125',
    },
    vehicle: {
      vehicle_number: 'クハE232-7025',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '126',
    },
    vehicle: {
      vehicle_number: 'クハE233-7026',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '126',
    },
    vehicle: {
      vehicle_number: 'モハE233-7426',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '126',
    },
    vehicle: {
      vehicle_number: 'モハE232-7426',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '126',
    },
    vehicle: {
      vehicle_number: 'サハE233-7226',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '126',
    },
    vehicle: {
      vehicle_number: 'サハE233-7026',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '126',
    },
    vehicle: {
      vehicle_number: 'モハE233-7026',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '126',
    },
    vehicle: {
      vehicle_number: 'モハE232-7026',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '126',
    },
    vehicle: {
      vehicle_number: 'モハE233-7226',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '126',
    },
    vehicle: {
      vehicle_number: 'モハE232-7226',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '126',
    },
    vehicle: {
      vehicle_number: 'クハE232-7026',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '127',
    },
    vehicle: {
      vehicle_number: 'クハE233-7027',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '127',
    },
    vehicle: {
      vehicle_number: 'モハE233-7427',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '127',
    },
    vehicle: {
      vehicle_number: 'モハE232-7427',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '127',
    },
    vehicle: {
      vehicle_number: 'サハE233-7227',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '127',
    },
    vehicle: {
      vehicle_number: 'サハE233-7027',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '127',
    },
    vehicle: {
      vehicle_number: 'モハE233-7027',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '127',
    },
    vehicle: {
      vehicle_number: 'モハE232-7027',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '127',
    },
    vehicle: {
      vehicle_number: 'モハE233-7227',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '127',
    },
    vehicle: {
      vehicle_number: 'モハE232-7227',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '127',
    },
    vehicle: {
      vehicle_number: 'クハE232-7027',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '128',
    },
    vehicle: {
      vehicle_number: 'クハE233-7028',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '128',
    },
    vehicle: {
      vehicle_number: 'モハE233-7428',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '128',
    },
    vehicle: {
      vehicle_number: 'モハE232-7428',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '128',
    },
    vehicle: {
      vehicle_number: 'サハE233-7228',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '128',
    },
    vehicle: {
      vehicle_number: 'サハE233-7028',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '128',
    },
    vehicle: {
      vehicle_number: 'モハE233-7028',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '128',
    },
    vehicle: {
      vehicle_number: 'モハE232-7028',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '128',
    },
    vehicle: {
      vehicle_number: 'モハE233-7228',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '128',
    },
    vehicle: {
      vehicle_number: 'モハE232-7228',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '128',
    },
    vehicle: {
      vehicle_number: 'クハE232-7028',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '129',
    },
    vehicle: {
      vehicle_number: 'クハE233-7029',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '129',
    },
    vehicle: {
      vehicle_number: 'モハE233-7429',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '129',
    },
    vehicle: {
      vehicle_number: 'モハE232-7429',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '129',
    },
    vehicle: {
      vehicle_number: 'サハE233-7229',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '129',
    },
    vehicle: {
      vehicle_number: 'サハE233-7029',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '129',
    },
    vehicle: {
      vehicle_number: 'モハE233-7029',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '129',
    },
    vehicle: {
      vehicle_number: 'モハE232-7029',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '129',
    },
    vehicle: {
      vehicle_number: 'モハE233-7229',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '129',
    },
    vehicle: {
      vehicle_number: 'モハE232-7229',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '129',
    },
    vehicle: {
      vehicle_number: 'クハE232-7029',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '130',
    },
    vehicle: {
      vehicle_number: 'クハE233-7030',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '130',
    },
    vehicle: {
      vehicle_number: 'モハE233-7430',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '130',
    },
    vehicle: {
      vehicle_number: 'モハE232-7430',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '130',
    },
    vehicle: {
      vehicle_number: 'サハE233-7230',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '130',
    },
    vehicle: {
      vehicle_number: 'サハE233-7030',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '130',
    },
    vehicle: {
      vehicle_number: 'モハE233-7030',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '130',
    },
    vehicle: {
      vehicle_number: 'モハE232-7030',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '130',
    },
    vehicle: {
      vehicle_number: 'モハE233-7230',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '130',
    },
    vehicle: {
      vehicle_number: 'モハE232-7230',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '130',
    },
    vehicle: {
      vehicle_number: 'クハE232-7030',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '131',
    },
    vehicle: {
      vehicle_number: 'クハE233-7031',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '131',
    },
    vehicle: {
      vehicle_number: 'モハE233-7431',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '131',
    },
    vehicle: {
      vehicle_number: 'モハE232-7431',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '131',
    },
    vehicle: {
      vehicle_number: 'サハE233-7231',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '131',
    },
    vehicle: {
      vehicle_number: 'サハE233-7031',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '131',
    },
    vehicle: {
      vehicle_number: 'モハE233-7031',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '131',
    },
    vehicle: {
      vehicle_number: 'モハE232-7031',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '131',
    },
    vehicle: {
      vehicle_number: 'モハE233-7231',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '131',
    },
    vehicle: {
      vehicle_number: 'モハE232-7231',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '131',
    },
    vehicle: {
      vehicle_number: 'クハE232-7031',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '132',
    },
    vehicle: {
      vehicle_number: 'クハE233-7032',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '132',
    },
    vehicle: {
      vehicle_number: 'モハE233-7432',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '132',
    },
    vehicle: {
      vehicle_number: 'モハE232-7432',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '132',
    },
    vehicle: {
      vehicle_number: 'サハE233-7232',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '132',
    },
    vehicle: {
      vehicle_number: 'サハE233-7032',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '132',
    },
    vehicle: {
      vehicle_number: 'モハE233-7032',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '132',
    },
    vehicle: {
      vehicle_number: 'モハE232-7032',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '132',
    },
    vehicle: {
      vehicle_number: 'モハE233-7232',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '132',
    },
    vehicle: {
      vehicle_number: 'モハE232-7232',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '132',
    },
    vehicle: {
      vehicle_number: 'クハE232-7032',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '133',
    },
    vehicle: {
      vehicle_number: 'クハE233-7033',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '133',
    },
    vehicle: {
      vehicle_number: 'モハE233-7433',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '133',
    },
    vehicle: {
      vehicle_number: 'モハE232-7433',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '133',
    },
    vehicle: {
      vehicle_number: 'サハE233-7233',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '133',
    },
    vehicle: {
      vehicle_number: 'サハE233-7033',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '133',
    },
    vehicle: {
      vehicle_number: 'モハE233-7033',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '133',
    },
    vehicle: {
      vehicle_number: 'モハE232-7033',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '133',
    },
    vehicle: {
      vehicle_number: 'モハE233-7233',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '133',
    },
    vehicle: {
      vehicle_number: 'モハE232-7233',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '133',
    },
    vehicle: {
      vehicle_number: 'クハE232-7033',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '134',
    },
    vehicle: {
      vehicle_number: 'クハE233-7034',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '134',
    },
    vehicle: {
      vehicle_number: 'モハE233-7434',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '134',
    },
    vehicle: {
      vehicle_number: 'モハE232-7434',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '134',
    },
    vehicle: {
      vehicle_number: 'サハE233-7234',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '134',
    },
    vehicle: {
      vehicle_number: 'サハE233-7034',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '134',
    },
    vehicle: {
      vehicle_number: 'モハE233-7034',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '134',
    },
    vehicle: {
      vehicle_number: 'モハE232-7034',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '134',
    },
    vehicle: {
      vehicle_number: 'モハE233-7234',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '134',
    },
    vehicle: {
      vehicle_number: 'モハE232-7234',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '134',
    },
    vehicle: {
      vehicle_number: 'クハE232-7034',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '135',
    },
    vehicle: {
      vehicle_number: 'クハE233-7035',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '135',
    },
    vehicle: {
      vehicle_number: 'モハE233-7435',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '135',
    },
    vehicle: {
      vehicle_number: 'モハE232-7435',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '135',
    },
    vehicle: {
      vehicle_number: 'サハE233-7235',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '135',
    },
    vehicle: {
      vehicle_number: 'サハE233-7035',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '135',
    },
    vehicle: {
      vehicle_number: 'モハE233-7035',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '135',
    },
    vehicle: {
      vehicle_number: 'モハE232-7035',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '135',
    },
    vehicle: {
      vehicle_number: 'モハE233-7235',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '135',
    },
    vehicle: {
      vehicle_number: 'モハE232-7235',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '135',
    },
    vehicle: {
      vehicle_number: 'クハE232-7035',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '136',
    },
    vehicle: {
      vehicle_number: 'クハE233-7036',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '136',
    },
    vehicle: {
      vehicle_number: 'モハE233-7436',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '136',
    },
    vehicle: {
      vehicle_number: 'モハE232-7436',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '136',
    },
    vehicle: {
      vehicle_number: 'サハE233-7236',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '136',
    },
    vehicle: {
      vehicle_number: 'サハE233-7036',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '136',
    },
    vehicle: {
      vehicle_number: 'モハE233-7036',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '136',
    },
    vehicle: {
      vehicle_number: 'モハE232-7036',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '136',
    },
    vehicle: {
      vehicle_number: 'モハE233-7236',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '136',
    },
    vehicle: {
      vehicle_number: 'モハE232-7236',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '136',
    },
    vehicle: {
      vehicle_number: 'クハE232-7036',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '137',
    },
    vehicle: {
      vehicle_number: 'クハE233-7037',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '137',
    },
    vehicle: {
      vehicle_number: 'モハE233-7437',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '137',
    },
    vehicle: {
      vehicle_number: 'モハE232-7437',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '137',
    },
    vehicle: {
      vehicle_number: 'サハE233-7237',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '137',
    },
    vehicle: {
      vehicle_number: 'サハE233-7037',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '137',
    },
    vehicle: {
      vehicle_number: 'モハE233-7037',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '137',
    },
    vehicle: {
      vehicle_number: 'モハE232-7037',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '137',
    },
    vehicle: {
      vehicle_number: 'モハE233-7237',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '137',
    },
    vehicle: {
      vehicle_number: 'モハE232-7237',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '137',
    },
    vehicle: {
      vehicle_number: 'クハE232-7037',
    },
    car_number: 1,
  },
  //////////////////////////////////////////////////////////////////
  {
    formation: {
      formation_number: '138',
    },
    vehicle: {
      vehicle_number: 'クハE233-7038',
    },
    car_number: 10,
  },
  {
    formation: {
      formation_number: '138',
    },
    vehicle: {
      vehicle_number: 'モハE233-7438',
    },
    car_number: 9,
  },
  {
    formation: {
      formation_number: '138',
    },
    vehicle: {
      vehicle_number: 'モハE232-7438',
    },
    car_number: 8,
  },
  {
    formation: {
      formation_number: '138',
    },
    vehicle: {
      vehicle_number: 'サハE233-7238',
    },
    car_number: 7,
  },
  {
    formation: {
      formation_number: '138',
    },
    vehicle: {
      vehicle_number: 'サハE233-7038',
    },
    car_number: 6,
  },
  {
    formation: {
      formation_number: '138',
    },
    vehicle: {
      vehicle_number: 'モハE233-7038',
    },
    car_number: 5,
  },
  {
    formation: {
      formation_number: '138',
    },
    vehicle: {
      vehicle_number: 'モハE232-7038',
    },
    car_number: 4,
  },
  {
    formation: {
      formation_number: '138',
    },
    vehicle: {
      vehicle_number: 'モハE233-7238',
    },
    car_number: 3,
  },
  {
    formation: {
      formation_number: '138',
    },
    vehicle: {
      vehicle_number: 'モハE232-7238',
    },
    car_number: 2,
  },
  {
    formation: {
      formation_number: '138',
    },
    vehicle: {
      vehicle_number: 'クハE232-7038',
    },
    car_number: 1,
  },
];

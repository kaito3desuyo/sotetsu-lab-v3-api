const uuidv4 = require('uuid/v4')
const _ = require('lodash')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.bulkInsert('People', [{
        name: 'John Doe',
        isBetaMember: false
      }], {});
    */

    const agencyId = [uuidv4(), uuidv4()]
    const sequelize = queryInterface.sequelize

    await queryInterface.bulkInsert(
      'agencies',
      [
        {
          id: agencyId[0],
          agency_number: '5020001022615',
          parent_agency_number: null,
          agency_official_name: '相模鉄道株式会社',
          agency_name: '相鉄',
          agency_type: 1,
          agency_url: null,
          agency_phone: null,
          agency_fare_url: null,
          created_at: '2018-11-23 12:00:00',
          updated_at: '2018-11-23 12:00:00'
        },
        {
          id: agencyId[1],
          agency_number: '9011001029597',
          parent_agency_number: null,
          agency_official_name: '東日本旅客鉄道株式会社',
          agency_name: 'JR東日本',
          agency_type: 1,
          agency_url: null,
          agency_phone: null,
          agency_fare_url: null,
          created_at: '2018-11-23 12:00:00',
          updated_at: '2018-11-23 12:00:00'
        }
      ],
      {}
    )

    const routeId = [uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4()]

    await queryInterface.bulkInsert('routes', [
      {
        id: routeId[0],
        agency_id: agencyId[0],
        route_number: 4,
        route_name: '本線',
        route_nickname: null,
        route_description: null,
        route_type: 2,
        route_url: null,
        route_color: null,
        route_text_color: null,
        created_at: '2018-11-23 12:00:00',
        updated_at: '2018-11-23 12:00:00'
      },
      {
        id: routeId[1],
        agency_id: agencyId[0],
        route_number: 5,
        route_name: 'いずみ野線',
        route_nickname: null,
        route_description: null,
        route_type: 2,
        route_url: null,
        route_color: null,
        route_text_color: null,
        created_at: '2018-11-23 12:00:00',
        updated_at: '2018-11-23 12:00:00'
      },
      {
        id: routeId[2],
        agency_id: agencyId[0],
        route_number: 6,
        route_name: '厚木線',
        route_nickname: null,
        route_description: null,
        route_type: 2,
        route_url: null,
        route_color: null,
        route_text_color: null,
        created_at: '2018-11-23 12:00:00',
        updated_at: '2018-11-23 12:00:00'
      },
      {
        id: routeId[3],
        agency_id: agencyId[0],
        route_number: 3,
        route_name: '新横浜線',
        route_nickname: null,
        route_description: null,
        route_type: 2,
        route_url: null,
        route_color: null,
        route_text_color: null,
        created_at: '2018-11-23 12:00:00',
        updated_at: '2018-11-23 12:00:00'
      },
      {
        id: routeId[4],
        agency_id: agencyId[1],
        route_number: 2,
        route_name: '埼京線',
        route_nickname: null,
        route_description: null,
        route_type: 2,
        route_url: null,
        route_color: null,
        route_text_color: null,
        created_at: '2018-11-23 12:00:00',
        updated_at: '2018-11-23 12:00:00'
      },
      {
        id: routeId[5],
        agency_id: agencyId[1],
        route_number: 1,
        route_name: '川越線',
        route_nickname: null,
        route_description: null,
        route_type: 2,
        route_url: null,
        route_color: null,
        route_text_color: null,
        created_at: '2018-11-23 12:00:00',
        updated_at: '2018-11-23 12:00:00'
      }
    ])

    const stationDetails = [
      {
        id: uuidv4(),
        name: '横浜',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          },
          {
            name: '3番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '平沼橋',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '西横浜',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '天王町',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '星川',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          },
          {
            name: '3番線'
          },
          {
            name: '4番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '和田町',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '上星川',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '西谷',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          },
          {
            name: '3番線'
          },
          {
            name: '4番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '鶴ヶ峰',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '二俣川',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          },
          {
            name: '3番線'
          },
          {
            name: '4番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '希望ヶ丘',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '三ツ境',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '瀬谷',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '大和',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '相模大塚',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: 'さがみ野',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: 'かしわ台',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          },
          {
            name: '3番線'
          },
          {
            name: '4番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '海老名',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '南万騎が原',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '緑園都市',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '弥生台',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: 'いずみ野',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          },
          {
            name: '3番線'
          },
          {
            name: '4番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: 'いずみ中央',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: 'ゆめが丘',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '湘南台',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '厚木',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '羽沢横浜国大',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '武蔵小杉',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '西大井',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '大崎',
        stops: [
          {
            name: '5番線'
          },
          {
            name: '6番線'
          },
          {
            name: '7番線'
          },
          {
            name: '8番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '恵比寿',
        stops: [
          {
            name: '3番線'
          },
          {
            name: '4番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '渋谷',
        stops: [
          {
            name: '3番線'
          },
          {
            name: '4番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '新宿',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          },
          {
            name: '3番線'
          },
          {
            name: '4番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '池袋',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          },
          {
            name: '3番線'
          },
          {
            name: '4番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '板橋',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '十条',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '赤羽',
        stops: [
          {
            name: '7番線'
          },
          {
            name: '8番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '北赤羽',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '浮間舟渡',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '戸田公園',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '戸田',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '北戸田',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '武蔵浦和',
        stops: [
          {
            name: '3番線'
          },
          {
            name: '4番線'
          },
          {
            name: '5番線'
          },
          {
            name: '6番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '中浦和',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '南与野',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '与野本町',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '北与野',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '大宮',
        stops: [
          {
            name: '19番線'
          },
          {
            name: '20番線'
          },
          {
            name: '21番線'
          },
          {
            name: '22番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '日進',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '西大宮',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '指扇',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '南古谷',
        stops: [
          {
            name: '1番線'
          },
          {
            name: '2番線'
          },
          {
            name: '3番線'
          }
        ]
      },
      {
        id: uuidv4(),
        name: '川越',
        stops: [
          {
            name: '3番線'
          },
          {
            name: '4番線'
          },
          {
            name: '5番線'
          },
          {
            name: '6番線'
          }
        ]
      }
    ]

    const stations = []
    const stops = []

    stationDetails.forEach(station => {
      stations.push({
        id: station.id,
        station_name: station.name,
        station_subname: null,
        station_type: 1,
        station_description: null,
        station_latlng: null,
        station_url: null,
        wheelchair_boarding: true,
        created_at: '2018-11-23 12:00:00',
        updated_at: '2018-11-23 12:00:00'
      })
      station.stops.forEach(stop => {
        stops.push({
          id: uuidv4(),
          station_id: station.id,
          stop_name: stop.name,
          stop_description: null,
          stop_latlng: null,
          zone_id: null,
          created_at: '2018-11-23 12:00:00',
          updated_at: '2018-11-23 12:00:00'
        })
      })
    })

    await queryInterface.bulkInsert('stations', stations, {})
    await queryInterface.bulkInsert('stops', stops, {})

    const main = [
      { name: '横浜', sequence: 0, numbering: 'SO01' },
      { name: '平沼橋', sequence: 1, numbering: 'SO02' },
      { name: '西横浜', sequence: 2, numbering: 'SO03' },
      { name: '天王町', sequence: 3, numbering: 'SO04' },
      { name: '星川', sequence: 4, numbering: 'SO05' },
      { name: '和田町', sequence: 5, numbering: 'SO06' },
      { name: '上星川', sequence: 6, numbering: 'SO07' },
      { name: '西谷', sequence: 7, numbering: 'SO08' },
      { name: '鶴ヶ峰', sequence: 8, numbering: 'SO09' },
      { name: '二俣川', sequence: 9, numbering: 'SO10' },
      { name: '希望ヶ丘', sequence: 10, numbering: 'SO11' },
      { name: '三ツ境', sequence: 11, numbering: 'SO12' },
      { name: '瀬谷', sequence: 12, numbering: 'SO13' },
      { name: '大和', sequence: 13, numbering: 'SO14' },
      { name: '相模大塚', sequence: 14, numbering: 'SO15' },
      { name: 'さがみ野', sequence: 15, numbering: 'SO16' },
      { name: 'かしわ台', sequence: 16, numbering: 'SO17' },
      { name: '海老名', sequence: 17, numbering: 'SO18' }
    ]
    const izumino = [
      { name: '二俣川', sequence: 0, numbering: 'SO10' },
      { name: '南万騎が原', sequence: 1, numbering: 'SO31' },
      { name: '緑園都市', sequence: 2, numbering: 'SO32' },
      { name: '弥生台', sequence: 3, numbering: 'SO33' },
      { name: 'いずみ野', sequence: 4, numbering: 'SO34' },
      { name: 'いずみ中央', sequence: 5, numbering: 'SO35' },
      { name: 'ゆめが丘', sequence: 6, numbering: 'SO36' },
      { name: '湘南台', sequence: 7, numbering: 'SO37' }
    ]
    const atsugi = [
      { name: 'かしわ台', sequence: 0, numbering: 'SO17' },
      { name: '厚木', sequence: 1, numbering: '' }
    ]
    const shinYokohama = [
      { name: '西谷', sequence: 1, numbering: 'SO08' },
      { name: '羽沢横浜国大', sequence: 0, numbering: 'SO51' }
    ]
    const saikyo = [
      { name: '羽沢横浜国大', sequence: 21, numbering: 'SO51' },
      { name: '武蔵小杉', sequence: 20, numbering: 'JO15/JS15' },
      { name: '西大井', sequence: 19, numbering: 'JO16/JS16' },
      { name: '大崎', sequence: 18, numbering: 'JS17/JA08' },
      { name: '恵比寿', sequence: 17, numbering: 'JA09' },
      { name: '渋谷', sequence: 16, numbering: 'JA10' },
      { name: '新宿', sequence: 15, numbering: 'JA11' },
      { name: '池袋', sequence: 14, numbering: 'JA12' },
      { name: '板橋', sequence: 13, numbering: 'JA13' },
      { name: '十条', sequence: 12, numbering: 'JA14' },
      { name: '赤羽', sequence: 11, numbering: 'JA15' },
      { name: '北赤羽', sequence: 10, numbering: 'JA16' },
      { name: '浮間舟渡', sequence: 9, numbering: 'JA17' },
      { name: '戸田公園', sequence: 8, numbering: 'JA18' },
      { name: '戸田', sequence: 7, numbering: 'JA19' },
      { name: '北戸田', sequence: 6, numbering: 'JA20' },
      { name: '武蔵浦和', sequence: 5, numbering: 'JA21' },
      { name: '中浦和', sequence: 4, numbering: 'JA22' },
      { name: '南与野', sequence: 3, numbering: 'JA23' },
      { name: '与野本町', sequence: 2, numbering: 'JA24' },
      { name: '北与野', sequence: 1, numbering: 'JA25' },
      { name: '大宮', sequence: 0, numbering: 'JA26' }
    ]
    const kawagoe = [
      { name: '大宮', sequence: 5, numbering: 'JA26' },
      { name: '日進', sequence: 4, numbering: '' },
      { name: '西大宮', sequence: 3, numbering: '' },
      { name: '指扇', sequence: 2, numbering: '' },
      { name: '南古谷', sequence: 1, numbering: '' },
      { name: '川越', sequence: 0, numbering: '' }
    ]

    await Promise.all([
      sequelize.query('SELECT * FROM routes', {
        type: sequelize.QueryTypes.SELECT
      }),
      sequelize.query('SELECT * FROM stations', {
        type: sequelize.QueryTypes.SELECT
      })
    ]).then(result => {
      const routeStationLists = []
      result[0].forEach(route => {
        result[1].forEach(station => {
          if (
            route.route_name === '本線' &&
            main.some(item => item.name === station.station_name)
          ) {
            const data = main.find(item => item.name === station.station_name)
            routeStationLists.push({
              id: uuidv4(),
              route_id: route.id,
              station_id: station.id,
              station_sequence: data.sequence,
              station_numbering: data.numbering,
              created_at: '2018-11-23 12:00:00',
              updated_at: '2018-11-23 12:00:00'
            })
          }
          if (
            route.route_name === 'いずみ野線' &&
            izumino.some(item => item.name === station.station_name)
          ) {
            const data = izumino.find(
              item => item.name === station.station_name
            )
            routeStationLists.push({
              id: uuidv4(),
              route_id: route.id,
              station_id: station.id,
              station_sequence: data.sequence,
              station_numbering: data.numbering,
              created_at: '2018-11-23 12:00:00',
              updated_at: '2018-11-23 12:00:00'
            })
          }
          if (
            route.route_name === '厚木線' &&
            atsugi.some(item => item.name === station.station_name)
          ) {
            const data = atsugi.find(item => item.name === station.station_name)
            routeStationLists.push({
              id: uuidv4(),
              route_id: route.id,
              station_id: station.id,
              station_sequence: data.sequence,
              station_numbering: data.numbering,
              created_at: '2018-11-23 12:00:00',
              updated_at: '2018-11-23 12:00:00'
            })
          }
          if (
            route.route_name === '新横浜線' &&
            shinYokohama.some(item => item.name === station.station_name)
          ) {
            const data = shinYokohama.find(
              item => item.name === station.station_name
            )
            routeStationLists.push({
              id: uuidv4(),
              route_id: route.id,
              station_id: station.id,
              station_sequence: data.sequence,
              station_numbering: data.numbering,
              created_at: '2018-11-23 12:00:00',
              updated_at: '2018-11-23 12:00:00'
            })
          }
          if (
            route.route_name === '埼京線' &&
            saikyo.some(item => item.name === station.station_name)
          ) {
            const data = saikyo.find(item => item.name === station.station_name)
            routeStationLists.push({
              id: uuidv4(),
              route_id: route.id,
              station_id: station.id,
              station_sequence: data.sequence,
              station_numbering: data.numbering,
              created_at: '2018-11-23 12:00:00',
              updated_at: '2018-11-23 12:00:00'
            })
          }
          if (
            route.route_name === '川越線' &&
            kawagoe.some(item => item.name === station.station_name)
          ) {
            const data = kawagoe.find(
              item => item.name === station.station_name
            )
            routeStationLists.push({
              id: uuidv4(),
              route_id: route.id,
              station_id: station.id,
              station_sequence: data.sequence,
              station_numbering: data.numbering,
              created_at: '2018-11-23 12:00:00',
              updated_at: '2018-11-23 12:00:00'
            })
          }
        })
      })
      return queryInterface.bulkInsert(
        'route_station_lists',
        routeStationLists,
        {}
      )
    })

    const serviceId = uuidv4()
    await queryInterface.bulkInsert(
      'services',
      [
        {
          id: serviceId,
          service_name: '相鉄本線・いずみ野線',
          service_description: null,
          created_at: '2018-11-23 12:00:00',
          updated_at: '2018-11-23 12:00:00'
        }
      ],
      {}
    )

    const operationArray = [
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      41,
      42,
      43,
      44,
      45,
      46,
      47,
      48,
      49,
      51,
      52,
      53,
      54,
      55,
      56,
      57,
      58,
      59,
      61,
      62,
      63,
      64,
      65,
      66,
      67,
      68,
      69,
      100
    ]

    const calenderDetail = [
      {
        name: '平日ダイヤ',
        startDate: '2009-11-01',
        endDate: '2012-04-28',
        operation: operationArray
      },
      {
        name: '土休日ダイヤ',
        startDate: '2009-11-01',
        endDate: '2012-04-28',
        operation: operationArray
      },
      {
        name: '平日ダイヤ',
        startDate: '2012-04-29',
        endDate: '2014-04-26',
        operation: operationArray
      },
      {
        name: '土休日ダイヤ',
        startDate: '2012-04-29',
        endDate: '2014-04-26',
        operation: operationArray
      },
      {
        name: '平日ダイヤ',
        startDate: '2014-04-27',
        endDate: '2015-05-30',
        operation: operationArray
      },
      {
        name: '土休日ダイヤ',
        startDate: '2014-04-27',
        endDate: '2015-05-30',
        operation: operationArray
      },
      {
        name: '平日ダイヤ',
        startDate: '2015-05-31',
        endDate: '2017-03-17',
        operation: operationArray
      },
      {
        name: '土休日ダイヤ',
        startDate: '2015-05-31',
        endDate: '2017-03-17',
        operation: operationArray
      },
      {
        name: '平日ダイヤ',
        startDate: '2017-03-18',
        endDate: '2018-12-07',
        operation: operationArray
      },
      {
        name: '土休日ダイヤ',
        startDate: '2017-03-18',
        endDate: '2018-12-07',
        operation: operationArray
      },
      {
        name: '平日ダイヤ',
        startDate: '2018-12-08',
        endDate: null,
        operation: operationArray
      },
      {
        name: '土休日ダイヤ',
        startDate: '2018-12-08',
        endDate: null,
        operation: operationArray
      }
    ]

    const calenders = []
    const operations = []

    calenderDetail.forEach(calender => {
      const calenderId = uuidv4()
      calenders.push({
        id: calenderId,
        service_id: serviceId,
        calender_name: calender.name,
        sunday: calender.name === '土休日ダイヤ',
        monday: calender.name === '平日ダイヤ',
        tuesday: calender.name === '平日ダイヤ',
        wednesday: calender.name === '平日ダイヤ',
        thursday: calender.name === '平日ダイヤ',
        friday: calender.name === '平日ダイヤ',
        saturday: calender.name === '土休日ダイヤ',
        start_date: calender.startDate,
        end_date: calender.endDate,
        created_at: '2018-11-23 12:00:00',
        updated_at: '2018-11-23 12:00:00'
      })
      calender.operation.forEach(operationNumber => {
        operations.push({
          id: uuidv4(),
          calender_id: calenderId,
          operation_number: operationNumber,
          created_at: '2018-11-23 12:00:00',
          updated_at: '2018-11-23 12:00:00'
        })
      })
    })

    await queryInterface.bulkInsert('calenders', calenders)
    await queryInterface.bulkInsert('operations', operations)

    await Promise.all([
      sequelize.query('SELECT id FROM services', {
        type: sequelize.QueryTypes.SELECT
      }),
      sequelize.query('SELECT id FROM routes ORDER BY route_number ASC', {
        type: sequelize.QueryTypes.SELECT
      })
    ]).then(result => {
      console.log(result[1])
      const routeSystems = []
      result[0].forEach(service => {
        result[1].forEach((route, index) => {
          routeSystems.push({
            id: uuidv4(),
            route_id: route.id,
            service_id: service.id,
            sequence: index,
            created_at: '2018-11-23 12:00:00',
            updated_at: '2018-11-23 12:00:00'
          })
        })
      })
      return queryInterface.bulkInsert('route_systems', routeSystems, {})
    })

    await queryInterface.bulkInsert('trip_classes', [
      {
        id: uuidv4(),
        service_id: serviceId,
        trip_class_name: '特急',
        trip_class_color: '#ff8000',
        sequence: 1,
        created_at: '2018-11-23 12:00:00',
        updated_at: '2018-11-23 12:00:00'
      },
      {
        id: uuidv4(),
        service_id: serviceId,
        trip_class_name: '急行',
        trip_class_color: '#ff0000',
        sequence: 2,
        created_at: '2018-11-23 12:00:00',
        updated_at: '2018-11-23 12:00:00'
      },
      {
        id: uuidv4(),
        service_id: serviceId,
        trip_class_name: '快速',
        trip_class_color: '#000080',
        sequence: 3,
        created_at: '2018-11-23 12:00:00',
        updated_at: '2018-11-23 12:00:00'
      },
      {
        id: uuidv4(),
        service_id: serviceId,
        trip_class_name: '各停',
        trip_class_color: '#000000',
        sequence: 4,
        created_at: '2018-11-23 12:00:00',
        updated_at: '2018-11-23 12:00:00'
      },
      {
        id: uuidv4(),
        service_id: serviceId,
        trip_class_name: '回送',
        trip_class_color: '#808080',
        sequence: 5,
        created_at: '2018-11-23 12:00:00',
        updated_at: '2018-11-23 12:00:00'
      }
    ])

    const formationDetails = [
      {
        forNum: 7707,
        startDate: null,
        endDate: '2019-03-06',
        vehicles: [
          { vehNum: 7707 },
          { vehNum: 7131 },
          { vehNum: 7132 },
          { vehNum: 7513 },
          { vehNum: 7605 },
          { vehNum: 7123 },
          { vehNum: 7124 },
          { vehNum: 7508 }
        ]
      },
      {
        forNum: 7710,
        startDate: null,
        endDate: null,
        vehicles: [
          { vehNum: 7710 },
          { vehNum: 7125 },
          { vehNum: 7126 },
          { vehNum: 7505 },
          { vehNum: 7602 },
          { vehNum: 7107 },
          { vehNum: 7108 },
          { vehNum: 7509 }
        ]
      },
      {
        forNum: 7712,
        startDate: null,
        endDate: null,
        vehicles: [
          { vehNum: 7712 },
          { vehNum: 7129 },
          { vehNum: 7130 },
          { vehNum: 7607 },
          { vehNum: 7703 },
          { vehNum: 7127 },
          { vehNum: 7128 },
          { vehNum: 7511 }
        ]
      },
      {
        forNum: 7713,
        startDate: null,
        endDate: null,
        vehicles: [
          { vehNum: 7713 },
          { vehNum: 7149 },
          { vehNum: 7150 },
          { vehNum: 7151 },
          { vehNum: 7152 },
          { vehNum: 7514 },
          { vehNum: 7714 },
          { vehNum: 7153 },
          { vehNum: 7154 },
          { vehNum: 7515 }
        ]
      },
      {
        forNum: 7715,
        startDate: null,
        endDate: null,
        vehicles: [
          { vehNum: 7715 },
          { vehNum: 7155 },
          { vehNum: 7158 },
          { vehNum: 7516 },
          { vehNum: 7716 },
          { vehNum: 7159 },
          { vehNum: 7160 },
          { vehNum: 7517 }
        ]
      },
      {
        forNum: 7751,
        startDate: null,
        endDate: null,
        vehicles: [
          { vehNum: 7751 },
          { vehNum: 7351 },
          { vehNum: 7651 },
          { vehNum: 7352 },
          { vehNum: 7551 },
          { vehNum: 7752 },
          { vehNum: 7353 },
          { vehNum: 7652 },
          { vehNum: 7354 },
          { vehNum: 7552 }
        ]
      },
      {
        forNum: 7753,
        startDate: null,
        endDate: null,
        vehicles: [
          { vehNum: 7753 },
          { vehNum: 7355 },
          { vehNum: 7653 },
          { vehNum: 7356 },
          { vehNum: 7654 },
          { vehNum: 7655 },
          { vehNum: 7357 },
          { vehNum: 7656 },
          { vehNum: 7358 },
          { vehNum: 7553 }
        ]
      },
      {
        forNum: 7754,
        startDate: null,
        endDate: null,
        vehicles: [
          { vehNum: 7754 },
          { vehNum: 7359 },
          { vehNum: 7657 },
          { vehNum: 7360 },
          { vehNum: 7658 },
          { vehNum: 7659 },
          { vehNum: 7361 },
          { vehNum: 7660 },
          { vehNum: 7362 },
          { vehNum: 7554 }
        ]
      },
      {
        forNum: 7755,
        startDate: null,
        endDate: null,
        vehicles: [
          { vehNum: 7755 },
          { vehNum: 7363 },
          { vehNum: 7661 },
          { vehNum: 7364 },
          { vehNum: 7662 },
          { vehNum: 7663 },
          { vehNum: 7365 },
          { vehNum: 7664 },
          { vehNum: 7366 },
          { vehNum: 7555 }
        ]
      },
      {
        forNum: 8701,
        startDate: '1990-12-01',
        endDate: null,
        vehicles: [
          { vehNum: 8701 },
          { vehNum: 8101 },
          { vehNum: 8201 },
          { vehNum: 8601 },
          { vehNum: 8102 },
          { vehNum: 8202 },
          { vehNum: 8602 },
          { vehNum: 8103 },
          { vehNum: 8203 },
          { vehNum: 8501 }
        ]
      },
      {
        forNum: 8702,
        startDate: '1991-03-01',
        endDate: null,
        vehicles: [
          { vehNum: 8702 },
          { vehNum: 8104 },
          { vehNum: 8204 },
          { vehNum: 8603 },
          { vehNum: 8105 },
          { vehNum: 8205 },
          { vehNum: 8604 },
          { vehNum: 8106 },
          { vehNum: 8206 },
          { vehNum: 8502 }
        ]
      },
      {
        forNum: 8703,
        startDate: '1991-03-01',
        endDate: null,
        vehicles: [
          { vehNum: 8703 },
          { vehNum: 8107 },
          { vehNum: 8207 },
          { vehNum: 8605 },
          { vehNum: 8108 },
          { vehNum: 8208 },
          { vehNum: 8606 },
          { vehNum: 8109 },
          { vehNum: 8209 },
          { vehNum: 8503 }
        ]
      },
      {
        forNum: 8704,
        startDate: '1992-01-01',
        endDate: null,
        vehicles: [
          { vehNum: 8704 },
          { vehNum: 8110 },
          { vehNum: 8210 },
          { vehNum: 8607 },
          { vehNum: 8111 },
          { vehNum: 8211 },
          { vehNum: 8608 },
          { vehNum: 8112 },
          { vehNum: 8212 },
          { vehNum: 8504 }
        ]
      },
      {
        forNum: 8705,
        startDate: '1992-03-01',
        endDate: null,
        vehicles: [
          { vehNum: 8705 },
          { vehNum: 8113 },
          { vehNum: 8213 },
          { vehNum: 8609 },
          { vehNum: 8114 },
          { vehNum: 8214 },
          { vehNum: 8610 },
          { vehNum: 8115 },
          { vehNum: 8215 },
          { vehNum: 8505 }
        ]
      },
      {
        forNum: 8706,
        startDate: '1992-03-01',
        endDate: null,
        vehicles: [
          { vehNum: 8706 },
          { vehNum: 8116 },
          { vehNum: 8216 },
          { vehNum: 8611 },
          { vehNum: 8117 },
          { vehNum: 8217 },
          { vehNum: 8612 },
          { vehNum: 8118 },
          { vehNum: 8218 },
          { vehNum: 8506 }
        ]
      },
      {
        forNum: 8707,
        startDate: '1993-02-01',
        endDate: '2006-03-31',
        vehicles: [
          { vehNum: 8707 },
          { vehNum: 8119 },
          { vehNum: 8219 },
          { vehNum: 8613 },
          { vehNum: 8120 },
          { vehNum: 8220 },
          { vehNum: 8614 },
          { vehNum: 8121 },
          { vehNum: 8221 },
          { vehNum: 8507 }
        ]
      },
      {
        forNum: 8708,
        startDate: '1994-03-01',
        endDate: null,
        vehicles: [
          { vehNum: 8708 },
          { vehNum: 8122 },
          { vehNum: 8222 },
          { vehNum: 8615 },
          { vehNum: 8123 },
          { vehNum: 8223 },
          { vehNum: 8616 },
          { vehNum: 8124 },
          { vehNum: 8224 },
          { vehNum: 8508 }
        ]
      },
      {
        forNum: 8709,
        startDate: '1995-04-01',
        endDate: null,
        vehicles: [
          { vehNum: 8709 },
          { vehNum: 8125 },
          { vehNum: 8225 },
          { vehNum: 8617 },
          { vehNum: 8126 },
          { vehNum: 8226 },
          { vehNum: 8618 },
          { vehNum: 8127 },
          { vehNum: 8227 },
          { vehNum: 8509 }
        ]
      },
      {
        forNum: 8710,
        startDate: '1996-03-01',
        endDate: null,
        vehicles: [
          { vehNum: 8710 },
          { vehNum: 8128 },
          { vehNum: 8228 },
          { vehNum: 8619 },
          { vehNum: 8129 },
          { vehNum: 8229 },
          { vehNum: 8620 },
          { vehNum: 8130 },
          { vehNum: 8230 },
          { vehNum: 8510 }
        ]
      },
      {
        forNum: 8711,
        startDate: '1997-03-01',
        endDate: null,
        vehicles: [
          { vehNum: 8711 },
          { vehNum: 8131 },
          { vehNum: 8231 },
          { vehNum: 8621 },
          { vehNum: 8132 },
          { vehNum: 8232 },
          { vehNum: 8622 },
          { vehNum: 8133 },
          { vehNum: 8233 },
          { vehNum: 8511 }
        ]
      },
      {
        forNum: 8712,
        startDate: '1998-03-01',
        endDate: null,
        vehicles: [
          { vehNum: 8712 },
          { vehNum: 8134 },
          { vehNum: 8234 },
          { vehNum: 8623 },
          { vehNum: 8135 },
          { vehNum: 8235 },
          { vehNum: 8624 },
          { vehNum: 8136 },
          { vehNum: 8236 },
          { vehNum: 8512 }
        ]
      },
      {
        forNum: 8713,
        startDate: '1999-09-01',
        endDate: null,
        vehicles: [
          { vehNum: 8713 },
          { vehNum: 8137 },
          { vehNum: 8237 },
          { vehNum: 8625 },
          { vehNum: 8138 },
          { vehNum: 8238 },
          { vehNum: 8626 },
          { vehNum: 8139 },
          { vehNum: 8239 },
          { vehNum: 8513 }
        ]
      },
      {
        forNum: 9701,
        startDate: '1993-01-01',
        endDate: null,
        vehicles: [
          { vehNum: 9701 },
          { vehNum: 9101 },
          { vehNum: 9201 },
          { vehNum: 9601 },
          { vehNum: 9102 },
          { vehNum: 9202 },
          { vehNum: 9602 },
          { vehNum: 9103 },
          { vehNum: 9203 },
          { vehNum: 9501 }
        ]
      },
      {
        forNum: 9702,
        startDate: '1993-03-01',
        endDate: null,
        vehicles: [
          { vehNum: 9702 },
          { vehNum: 9104 },
          { vehNum: 9204 },
          { vehNum: 9603 },
          { vehNum: 9105 },
          { vehNum: 9205 },
          { vehNum: 9604 },
          { vehNum: 9106 },
          { vehNum: 9206 },
          { vehNum: 9502 }
        ]
      },
      {
        forNum: 9703,
        startDate: '1995-03-01',
        endDate: null,
        vehicles: [
          { vehNum: 9703 },
          { vehNum: 9107 },
          { vehNum: 9207 },
          { vehNum: 9605 },
          { vehNum: 9108 },
          { vehNum: 9208 },
          { vehNum: 9606 },
          { vehNum: 9109 },
          { vehNum: 9209 },
          { vehNum: 9503 }
        ]
      },
      {
        forNum: 9704,
        startDate: '1996-01-01',
        endDate: null,
        vehicles: [
          { vehNum: 9704 },
          { vehNum: 9110 },
          { vehNum: 9210 },
          { vehNum: 9607 },
          { vehNum: 9111 },
          { vehNum: 9211 },
          { vehNum: 9608 },
          { vehNum: 9112 },
          { vehNum: 9212 },
          { vehNum: 9504 }
        ]
      },
      {
        forNum: 9705,
        startDate: '1996-05-01',
        endDate: null,
        vehicles: [
          { vehNum: 9705 },
          { vehNum: 9113 },
          { vehNum: 9213 },
          { vehNum: 9609 },
          { vehNum: 9114 },
          { vehNum: 9214 },
          { vehNum: 9610 },
          { vehNum: 9115 },
          { vehNum: 9215 },
          { vehNum: 9505 }
        ]
      },
      {
        forNum: 9706,
        startDate: '1999-02-01',
        endDate: null,
        vehicles: [
          { vehNum: 9706 },
          { vehNum: 9116 },
          { vehNum: 9216 },
          { vehNum: 9611 },
          { vehNum: 9117 },
          { vehNum: 9217 },
          { vehNum: 9612 },
          { vehNum: 9118 },
          { vehNum: 9218 },
          { vehNum: 9506 }
        ]
      },
      {
        forNum: 9707,
        startDate: '2001-03-01',
        endDate: null,
        vehicles: [
          { vehNum: 9707 },
          { vehNum: 9119 },
          { vehNum: 9219 },
          { vehNum: 9613 },
          { vehNum: 9120 },
          { vehNum: 9220 },
          { vehNum: 9614 },
          { vehNum: 9121 },
          { vehNum: 9221 },
          { vehNum: 9507 }
        ]
      },
      {
        forNum: 10701,
        startDate: '2002-01-01',
        endDate: null,
        vehicles: [
          { vehNum: 10701 },
          { vehNum: 10201 },
          { vehNum: 10101 },
          { vehNum: 10601 },
          { vehNum: 10301 },
          { vehNum: 10602 },
          { vehNum: 10603 },
          { vehNum: 10202 },
          { vehNum: 10102 },
          { vehNum: 10501 }
        ]
      },
      {
        forNum: 10702,
        startDate: '2002-03-01',
        endDate: null,
        vehicles: [
          { vehNum: 10702 },
          { vehNum: 10203 },
          { vehNum: 10103 },
          { vehNum: 10604 },
          { vehNum: 10302 },
          { vehNum: 10605 },
          { vehNum: 10606 },
          { vehNum: 10204 },
          { vehNum: 10104 },
          { vehNum: 10502 }
        ]
      },
      {
        forNum: 10703,
        startDate: '2003-03-01',
        endDate: null,
        vehicles: [
          { vehNum: 10703 },
          { vehNum: 10205 },
          { vehNum: 10105 },
          { vehNum: 10607 },
          { vehNum: 10608 },
          { vehNum: 10206 },
          { vehNum: 10106 },
          { vehNum: 10503 }
        ]
      },
      {
        forNum: 10704,
        startDate: '2004-03-01',
        endDate: null,
        vehicles: [
          { vehNum: 10704 },
          { vehNum: 10207 },
          { vehNum: 10107 },
          { vehNum: 10609 },
          { vehNum: 10610 },
          { vehNum: 10208 },
          { vehNum: 10108 },
          { vehNum: 10504 }
        ]
      },
      {
        forNum: 10705,
        startDate: '2005-01-01',
        endDate: null,
        vehicles: [
          { vehNum: 10705 },
          { vehNum: 10209 },
          { vehNum: 10109 },
          { vehNum: 10611 },
          { vehNum: 10612 },
          { vehNum: 10210 },
          { vehNum: 10110 },
          { vehNum: 10505 }
        ]
      },
      {
        forNum: 10706,
        startDate: '2005-02-01',
        endDate: null,
        vehicles: [
          { vehNum: 10706 },
          { vehNum: 10211 },
          { vehNum: 10111 },
          { vehNum: 10613 },
          { vehNum: 10614 },
          { vehNum: 10212 },
          { vehNum: 10112 },
          { vehNum: 10506 }
        ]
      },
      {
        forNum: 10707,
        startDate: '2005-02-01',
        endDate: null,
        vehicles: [
          { vehNum: 10707 },
          { vehNum: 10213 },
          { vehNum: 10113 },
          { vehNum: 10615 },
          { vehNum: 10616 },
          { vehNum: 10214 },
          { vehNum: 10114 },
          { vehNum: 10507 }
        ]
      },
      {
        forNum: 10708,
        startDate: '2007-03-01',
        endDate: null,
        vehicles: [
          { vehNum: 10708 },
          { vehNum: 10215 },
          { vehNum: 10115 },
          { vehNum: 10617 },
          { vehNum: 10303 },
          { vehNum: 10618 },
          { vehNum: 10619 },
          { vehNum: 10216 },
          { vehNum: 10116 },
          { vehNum: 10508 }
        ]
      },
      {
        forNum: 11001,
        startDate: '2009-06-15',
        endDate: null,
        vehicles: [
          { vehNum: 11001 },
          { vehNum: 11101 },
          { vehNum: 11201 },
          { vehNum: 11301 },
          { vehNum: 11401 },
          { vehNum: 11501 },
          { vehNum: 11601 },
          { vehNum: 11701 },
          { vehNum: 11801 },
          { vehNum: 11901 }
        ]
      },
      {
        forNum: 11002,
        startDate: '2009-06-15',
        endDate: null,
        vehicles: [
          { vehNum: 11002 },
          { vehNum: 11102 },
          { vehNum: 11202 },
          { vehNum: 11302 },
          { vehNum: 11402 },
          { vehNum: 11502 },
          { vehNum: 11602 },
          { vehNum: 11702 },
          { vehNum: 11802 },
          { vehNum: 11902 }
        ]
      },
      {
        forNum: 11003,
        startDate: '2010-03-01',
        endDate: null,
        vehicles: [
          { vehNum: 11003 },
          { vehNum: 11103 },
          { vehNum: 11203 },
          { vehNum: 11303 },
          { vehNum: 11403 },
          { vehNum: 11503 },
          { vehNum: 11603 },
          { vehNum: 11703 },
          { vehNum: 11803 },
          { vehNum: 11903 }
        ]
      },
      {
        forNum: 11004,
        startDate: '2011-05-01',
        endDate: null,
        vehicles: [
          { vehNum: 11004 },
          { vehNum: 11104 },
          { vehNum: 11204 },
          { vehNum: 11304 },
          { vehNum: 11404 },
          { vehNum: 11504 },
          { vehNum: 11604 },
          { vehNum: 11704 },
          { vehNum: 11804 },
          { vehNum: 11904 }
        ]
      },
      {
        forNum: 11005,
        startDate: '2013-03-01',
        endDate: null,
        vehicles: [
          { vehNum: 11005 },
          { vehNum: 11105 },
          { vehNum: 11205 },
          { vehNum: 11305 },
          { vehNum: 11405 },
          { vehNum: 11505 },
          { vehNum: 11605 },
          { vehNum: 11705 },
          { vehNum: 11805 },
          { vehNum: 11905 }
        ]
      },
      {
        forNum: 20101,
        startDate: '2018-02-11',
        endDate: null,
        vehicles: [
          { vehNum: 20101 },
          { vehNum: 20201 },
          { vehNum: 20301 },
          { vehNum: 20401 },
          { vehNum: 20501 },
          { vehNum: 20601 },
          { vehNum: 20701 },
          { vehNum: 20801 },
          { vehNum: 20901 },
          { vehNum: 20001 }
        ]
      },
      {
        forNum: 12101,
        startDate: '2019-04-20',
        endDate: null,
        vehicles: [
          { vehNum: 12101 },
          { vehNum: 12201 },
          { vehNum: 12301 },
          { vehNum: 12401 },
          { vehNum: 12501 },
          { vehNum: 12601 },
          { vehNum: 12701 },
          { vehNum: 12801 },
          { vehNum: 12901 },
          { vehNum: 12001 }
        ]
      }
    ]

    const formations = []
    const vehicles = []

    formationDetails.forEach(formation => {
      const forId = uuidv4()
      formations.push({
        id: forId,
        agency_id: agencyId[0],
        vehicle_type: null,
        formation_number: formation.forNum,
        start_date: formation.startDate,
        end_date: formation.endDate,
        created_at: '2018-11-23 12:00:00',
        updated_at: '2018-11-23 12:00:00'
      })
      formation.vehicles.forEach(vehicle => {
        vehicles.push({
          id: uuidv4(),
          formation_id: null,
          vehicle_number: vehicle.vehNum,
          belongs: '相模鉄道かしわ台車両センター',
          production_date: null,
          scrapped_date: null,
          created_at: '2018-11-23 12:00:00',
          updated_at: '2018-11-23 12:00:00'
        })
      })
    })

    await queryInterface.bulkInsert('formations', formations, {})
    await queryInterface.bulkInsert('vehicles', vehicles, {})

    await Promise.all([
      sequelize.query('SELECT * FROM formations', {
        type: sequelize.QueryTypes.SELECT
      }),
      sequelize.query('SELECT * FROM vehicles', {
        type: sequelize.QueryTypes.SELECT
      })
    ]).then(result => {
      console.log(result[0])
      const returnArray = []
      formationDetails.forEach(formation => {
        const forArr = _.find(result[0], [
          'formation_number',
          formation.forNum.toString()
        ])

        formation.vehicles.forEach((vehicle, index) => {
          const vehArr = _.find(result[1], [
            'vehicle_number',
            vehicle.vehNum.toString()
          ])
          returnArray.push({
            id: uuidv4(),
            formation_id: forArr.id,
            vehicle_id: vehArr.id,
            car_number: index + 1,
            created_at: '2018-11-23 12:00:00',
            updated_at: '2018-11-23 12:00:00'
          })
        })
      })

      console.log(returnArray)
      return queryInterface.bulkInsert('vehicle_formations', returnArray, {})
    })
  },
  down: async (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.bulkDelete('People', null, {});
    */
    await queryInterface.bulkDelete('agencies', null, {})
    await queryInterface.bulkDelete('routes', null, {})
    await queryInterface.bulkDelete('stations', null, {})
    await queryInterface.bulkDelete('route_station_lists', null, {})
    await queryInterface.bulkDelete('stops', null, {})
    await queryInterface.bulkDelete('services', null, {})
    await queryInterface.bulkDelete('calenders', null, {})
    await queryInterface.bulkDelete('route_systems', null, {})
    await queryInterface.bulkDelete('formations', null, {})
    await queryInterface.bulkDelete('vehicles', null, {})
    await queryInterface.bulkDelete('vehicle_formations', null, {})
    await queryInterface.bulkDelete('operations', null, {})
    await queryInterface.bulkDelete('operation_sightings', null, {})
    await queryInterface.bulkDelete('times', null, {})
    await queryInterface.bulkDelete('trip_classes', null, {})
    await queryInterface.bulkDelete('trips', null, {})
  }
}

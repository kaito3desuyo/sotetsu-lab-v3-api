const uuidv4 = require('uuid/v4')

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

    const agencyId = uuidv4()
    const sequelize = queryInterface.sequelize

    await queryInterface.bulkInsert(
      'agencies',
      [
        {
          id: agencyId,
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
        }
      ],
      {}
    )

    const routeId = [uuidv4(), uuidv4(), uuidv4()]

    await queryInterface.bulkInsert('routes', [
      {
        id: routeId[0],
        agency_id: agencyId,
        route_number: 1,
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
        agency_id: agencyId,
        route_number: 2,
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
        agency_id: agencyId,
        route_number: 3,
        route_name: '厚木線',
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
      69
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
      sequelize.query('SELECT id FROM routes', {
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
  }
}

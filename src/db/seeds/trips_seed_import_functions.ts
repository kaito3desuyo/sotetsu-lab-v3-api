import { find, filter, map } from "lodash";
import { Station } from "../../main/v1/station/station.entity";
import { Stop } from "../../main/v1/stop/stop.entity";
import { TripClass } from "../../main/v1/trip/trip_class.entity";
import { Calender } from "../../main/v1/calender/calender.entity";
import { Operation } from "../../main/v1/operation/operation.entity";
import { getRepository, DeepPartial } from "typeorm";
import { Service } from "../../main/v1/service/service.entity";
import { Trip } from "../../main/v1/trip/trip.entity";
import { Time } from "../../main/v1/time/time.entity";
import moment from 'moment'
import uuidv4 from 'uuid/v4';

export async function tripsSeedToSaveData(seed: any[], startDate: string): Promise<DeepPartial<Trip>[]> {
    const services = await getRepository(Service).find()
    const operations = await getRepository(Operation).find()
    const calenders = await getRepository(Calender).find()
    const tripClasses = await getRepository(TripClass).find()
    const stations = await getRepository(Station).find({ relations: ['station_to_routes'] });
    const stops = await getRepository(Stop).find()

    const filteredTripsSeed = filter(seed, (trip) => trip.operation_id && trip.train_id) as any;
    const trips: DeepPartial<Trip>[] = map(filteredTripsSeed, seed => {
        const calenderId = getCalenderId(seed.day as 'weekday' | 'holiday', startDate, calenders);
        const operationId = getOperationId(seed.operation_id, calenderId, operations);
        const tripClassId = getTripClassId(seed.class, tripClasses);

        const times: Partial<Time>[] = stations.map(station => {
            if (seed[stationNumberingMap.get(station.station_name)]) {
                return {
                    station_id: station.id,
                    stop_id: getStopId(station.id, stops),
                    arrival_days: moment(seed[stationNumberingMap.get(station.station_name)], 'HH:mm:ss').hour() > 3 ? 1 : 2,
                    arrival_time: seed[stationNumberingMap.get(station.station_name)],
                    departure_days: moment(seed[stationNumberingMap.get(station.station_name)], 'HH:mm:ss').hour() > 3 ? 1 : 2,
                    departure_time: seed[stationNumberingMap.get(station.station_name)]
                }
            } else if (seed[stationNumberingMap.get(station.station_name) + '_dep'] || seed[stationNumberingMap.get(station.station_name) + '_arr']) {
                return {
                    station_id: station.id,
                    stop_id: getStopId(station.id, stops),
                    arrival_days: seed[stationNumberingMap.get(station.station_name) + '_arr'] ? (moment(seed[stationNumberingMap.get(station.station_name) + '_arr'], 'HH:mm:ss').hour() > 3 ? 1 : 2) : null,
                    arrival_time: seed[stationNumberingMap.get(station.station_name) + '_arr'] ? seed[stationNumberingMap.get(station.station_name) + '_arr'] : null,
                    departure_days: seed[stationNumberingMap.get(station.station_name) + '_dep'] ? (moment(seed[stationNumberingMap.get(station.station_name) + '_dep'], 'HH:mm:ss').hour() > 3 ? 1 : 2) : null,
                    departure_time: seed[stationNumberingMap.get(station.station_name) + '_dep'] ? seed[stationNumberingMap.get(station.station_name) + '_dep'] : null,
                }
            } else {
                return null
            }
        }).filter(time => {
            console.log(time)
            return time
        }).map((time, index, array) => {
            return {
                ...time,
                stop_sequence:
                    Number(seed.train_id) % 2 === 0 ? array.length - index : index + 1,
                pickup_type: index === array.length - 1 ? 1 : 0,
                dropoff_type: index === 0 ? 1 : 0,
                arrival_days: Number(seed.train_id) % 2 === 0 ? (index === array.length - 1 ? null : time.arrival_days) : (index === 0 ? null : time.arrival_days),
                arrival_time: Number(seed.train_id) % 2 === 0 ? (index === array.length - 1 ? null : time.arrival_time) : (index === 0 ? null : time.arrival_time),
                departure_days: Number(seed.train_id) % 2 === 0 ? (index === 0 ? null : time.departure_days) : (index === array.length - 1 ? null : time.departure_days),
                departure_time: Number(seed.train_id) % 2 === 0 ? (index === 0 ? null : time.departure_time) : (index === array.length - 1 ? null : time.departure_time),
            }
        });

        return {
            service_id: find(services, (service) => service.service_name === '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線').id,
            operation_id: operationId,
            calender_id: calenderId,
            trip_number: seed.train_id,
            trip_class_id: tripClassId,
            trip_direction: Number(seed.train_id) % 2 === 0 ? 0 : 1,
            trip_block_id: uuidv4(),
            depot_in: seed.depot_in,
            depot_out: seed.depot_out,
            times: times
        }
    })

    return trips
}

const stationNumberingMap = new Map([
    ["横浜", "SO01"],
    ["平沼橋", "SO02"],
    ["西横浜", "SO03"],
    ["天王町", "SO04"],
    ["星川", "SO05"],
    ["和田町", "SO06"],
    ["上星川", "SO07"],
    ["西谷", "SO08"],
    ["鶴ヶ峰", "SO09"],
    ["二俣川", "SO10"],
    ["希望ヶ丘", "SO11"],
    ["三ツ境", "SO12"],
    ["瀬谷", "SO13"],
    ["大和", "SO14"],
    ["相模大塚", "SO15"],
    ["さがみ野", "SO16"],
    ["かしわ台", "SO17"],
    ["海老名", "SO18"],
    ["南万騎が原", "SO31"],
    ["緑園都市", "SO32"],
    ["弥生台", "SO33"],
    ["いずみ野", "SO34"],
    ["いずみ中央", "SO35"],
    ["ゆめが丘", "SO36"],
    ["湘南台", "SO37"],
    ["厚木", "SO41"],
    ["羽沢横浜国大", "SO51"],
])

function getCalenderId(day: 'weekday' | 'holiday', startDate: string, calenders: Calender[]): string {
    switch (day) {
        case 'weekday':
            return find(calenders as any, (calender) => calender.calender_name === '平日ダイヤ' && calender.start_date === startDate).id

        case 'holiday':
            return find(calenders as any, (calender) => calender.calender_name === '土休日ダイヤ' && calender.start_date === startDate).id
    }
}

function getOperationId(operationNumber: string, calenderId: string, operations: Operation[]): string {
    console.log(operationNumber, calenderId)
    return find(operations, (operation) => operation.operation_number === operationNumber && operation.calender_id === calenderId).id
}

function getTripClassId(className: string, tripClasses: TripClass[]): string {
    return find(tripClasses, (tripClass) => tripClass.trip_class_name === className).id
}

function getStationId(stationName: string, stations: Station[]): string {
    return find(stations, (station) => station.station_name === stationName).id
}

function getStopId(stationId: string, stops: Stop[]): string {
    return find(stops, (stop) => stop.station_id === stationId).id
}
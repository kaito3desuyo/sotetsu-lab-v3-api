import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Service } from './service.entity';
import {
    Repository,
    FindManyOptions,
    FindOneOptions,
    QueryRunner,
} from 'typeorm';
import { Station } from '../station/station.entity';
import { sortBy, some, findIndex } from 'lodash';
import { RouteStationList } from '../route-station-list/route-station-list.entity';

@Injectable()
export class ServiceService {
    constructor(
        @InjectRepository(Service)
        private readonly serviceRepository: Repository<Service>,
    ) {}

    createQueryBuilder(alias?: string, queryRunner?: QueryRunner) {
        return this.serviceRepository.createQueryBuilder(alias, queryRunner);
    }

    findAll(options?: FindManyOptions): Promise<Service[]> {
        return this.serviceRepository.find(options);
    }

    findOne(options?: FindOneOptions): Promise<Service> {
        return this.serviceRepository.findOne(options);
    }

    async findStationsByServiceId(
        serviceId: string,
        tripDirection: '0' | '1',
    ): Promise<{ stations: Station[] }> {
        const service = await this.serviceRepository.findOne({
            where: {
                id: serviceId,
            },
            relations: [
                'operating_systems',
                'operating_systems.route',
                'operating_systems.route.route_station_lists',
                'operating_systems.route.route_station_lists.route',
                'operating_systems.route.route_station_lists.station',
                'operating_systems.route.route_station_lists.station.stops',
                'operating_systems.start_route_station_list',
                'operating_systems.start_route_station_list.station',
                'operating_systems.end_route_station_list',
                'operating_systems.end_route_station_list.station',
            ],
        });

        const operatingSystems = sortBy(
            service.operating_systems,
            (o) => o.sequence,
        );

        const pickedRouteStationLists: RouteStationList[] = [];
        operatingSystems.forEach((operatingSystem) => {
            const sortedRouteStationLists: RouteStationList[] =
                operatingSystem.start_route_station_list.station_sequence <
                operatingSystem.end_route_station_list.station_sequence
                    ? sortBy(
                          operatingSystem.route.route_station_lists,
                          (o) => o.station_sequence,
                      )
                    : sortBy(
                          operatingSystem.route.route_station_lists,
                          (o) => o.station_sequence,
                      ).reverse();

            const initialPosition = findIndex(pickedRouteStationLists, (o) => {
                return (
                    o.station_id ===
                    operatingSystem.start_route_station_list.station_id
                );
            });

            let position = initialPosition;

            if (initialPosition === -1) {
                position = pickedRouteStationLists.length - 1;
            }

            const startStationIndex = findIndex(
                sortedRouteStationLists,
                (o) =>
                    o.station_id ===
                    operatingSystem.start_route_station_list.station_id,
            );
            const endStationIndex = findIndex(
                sortedRouteStationLists,
                (o) =>
                    o.station_id ===
                    operatingSystem.end_route_station_list.station_id,
            );

            sortedRouteStationLists
                .filter(
                    (_, i) => startStationIndex <= i && i <= endStationIndex,
                )
                .forEach((sortedRouteStationList) => {
                    if (sortedRouteStationList.route.route_name === '厚木線') {
                        pickedRouteStationLists.push(sortedRouteStationList);
                        position = pickedRouteStationLists.length - 1;
                    } else {
                        pickedRouteStationLists.splice(
                            position + 1,
                            0,
                            sortedRouteStationList,
                        );
                        position++;
                    }
                });
        });

        const stations: Station[] = [];
        pickedRouteStationLists.forEach((picked, index, array) => {
            // 優先度設定を行う？

            if (
                array[index + 1] &&
                array[index + 1].station_id === picked.station_id
            ) {
                return true;
            }

            if (
                array[index + 1] &&
                array[index + 1].station_id !== picked.station_id
            ) {
                if (
                    some(
                        array,
                        (o, i) =>
                            index < i &&
                            o.station_id === picked.station_id &&
                            o.route.route_name !== '厚木線',
                    )
                ) {
                    return true;
                }
            }

            if (
                picked.route.route_name === '厚木線' &&
                some(
                    array,
                    (o, i) => i < index && o.station_id === picked.station_id,
                )
            ) {
                return true;
            }

            stations.push(picked.station);
        });

        if (tripDirection === '0') {
            stations.reverse();
        }

        return { stations };
    }
}

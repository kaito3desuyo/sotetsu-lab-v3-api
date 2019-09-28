import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Service } from './service.entity';
import { ServiceService } from './service.service';
import { sortBy, findIndex, some } from 'lodash';
import { RouteStationList } from '../route-station-list/route-station-list.entity';

@Controller()
export class ServiceController {
  constructor(private serviceService: ServiceService) {}

  @Get()
  async getServices(): Promise<Service[]> {
    const services = await this.serviceService.findAll({
      relations: ['service_to_routes'],
    });
    return services;
  }

  @Get('/search')
  async searchServices(@Query() query: { service_name?: string }): Promise<{
    services: Service[];
  }> {
    const whereObj = {};
    if (query.service_name) {
      // tslint:disable-next-line: no-string-literal
      whereObj['service_name'] = query.service_name;
    }

    try {
      const services = await this.serviceService.findAll({
        where: whereObj,
      });
      return { services };
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }

  @Get('/:serviceId/stations')
  async getServiceStationsById(): Promise<{ stations: any }> {
    try {
      const service = await this.serviceService.findOne({
        relations: [
          'operating_systems',
          'operating_systems.route',
          'operating_systems.route.route_station_lists',
          'operating_systems.route.route_station_lists.station',
          'operating_systems.start_route_station_list',
          'operating_systems.start_route_station_list.station',
          'operating_systems.end_route_station_list',
          'operating_systems.end_route_station_list.station',
        ],
      });

      const sortedOperationSystems = sortBy(
        service.operating_systems,
        o => o.sequence,
      );

      const pickedRouteStationLists: RouteStationList[] = [];
      sortedOperationSystems.forEach((operatingSystem, index) => {
        let sortedRouteStationLists: RouteStationList[] = [];
        if (
          operatingSystem.start_route_station_list.station_sequence <
          operatingSystem.end_route_station_list.station_sequence
        ) {
          console.log('この路線は下り方向です');
          sortedRouteStationLists = sortBy(
            operatingSystem.route.route_station_lists,
            o => o.station_sequence,
          );
        } else {
          console.log('この路線は上り方向です');
          sortedRouteStationLists = sortBy(
            operatingSystem.route.route_station_lists,
            o => o.station_sequence,
          ).reverse();
        }

        const startStationId =
          operatingSystem.start_route_station_list.station_id;
        const endStationId = operatingSystem.end_route_station_list.station_id;

        const currentStartRouteStationListPosition = findIndex(
          pickedRouteStationLists,
          routeStationList => {
            return routeStationList.station_id === startStationId;
          },
        );

        /*
        let currentEndRouteStationListPosition = findIndex(
          pickedRouteStationLists,
          routeStationList => {
            return routeStationList.station_id === endStationId;
          },
        );
        */

        let flg = false;
        let position = currentStartRouteStationListPosition;

        if (currentStartRouteStationListPosition === -1) {
          position = pickedRouteStationLists.length - 1;
        }

        sortedRouteStationLists.forEach(sortedRouteStationList => {
          if (sortedRouteStationList.station_id === startStationId) {
            flg = true;
          }

          if (flg) {
            pickedRouteStationLists.splice(
              position + 1,
              0,
              sortedRouteStationList,
            );
            position++;
          }

          if (sortedRouteStationList.station_id === endStationId) {
            flg = false;
          }
        });
      });

      const stations: any[] = [];
      pickedRouteStationLists.forEach((picked, index, array) => {
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
          const afterCurrentIndexArray = [];
          array.forEach((o, i) => {
            if (index < i) {
              afterCurrentIndexArray.push(o);
            }
          });

          if (
            some(
              afterCurrentIndexArray,
              o => o.station_id === picked.station_id,
            )
          ) {
            return true;
          }
        }
        stations.push(picked.station);
      });

      return { stations };
    } catch (e) {}
  }
}

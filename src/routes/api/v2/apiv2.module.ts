import { Module } from '@nestjs/common';
import { Route, RouterModule } from 'nest-router';
import { AgencyV2Module } from 'src/libs/agency/agency.v2.module';
import { CalendarV2Module } from 'src/libs/calendar/calendar.v2.module';
import { FormationV2Module } from 'src/libs/formation/formation.v2.module';
import { OperationSightingV2Module } from 'src/libs/operation-sighting/operation-sighting.v2.module';
import { RouteV2Module } from 'src/libs/route/route.v2.module';
import { ServiceV2Module } from 'src/libs/service/service.v2.module';
import { StationV2Module } from 'src/libs/station/station.v2.module';
import { TripBlockV2Module } from 'src/libs/trip-block/trip-block.v2.module';
import { TripClassV2Module } from 'src/libs/trip-class/trip-class.v2.module';
import { TripV2Module } from 'src/libs/trip/trip.v2.module';
import { VehicleV2Module } from 'src/libs/vehicle/vehicle.v2.module';
import { OperationV2Module } from '../../../libs/operation/operation.v2.module';

const routes: Route[] = [
    {
        path: '/v2',
        children: [
            {
                path: '/agencies',
                module: AgencyV2Module,
            },
            {
                path: '/services',
                module: ServiceV2Module,
            },
            {
                path: '/calendars',
                module: CalendarV2Module,
            },
            {
                path: '/routes',
                module: RouteV2Module,
            },
            {
                path: '/formations',
                module: FormationV2Module,
            },
            {
                path: '/vehicles',
                module: VehicleV2Module,
            },
            {
                path: '/operations',
                module: OperationV2Module,
            },
            {
                path: '/operation-sightings',
                module: OperationSightingV2Module,
            },
            {
                path: '/stations',
                module: StationV2Module,
            },
            {
                path: '/trips',
                module: TripV2Module,
            },
            {
                path: '/trip-classes',
                module: TripClassV2Module,
            },
            {
                path: '/trip-blocks',
                module: TripBlockV2Module,
            },
        ],
    },
];

@Module({
    imports: [
        RouterModule.forRoutes(routes),
        AgencyV2Module,
        ServiceV2Module,
        CalendarV2Module,
        RouteV2Module,
        FormationV2Module,
        VehicleV2Module,
        OperationV2Module,
        OperationSightingV2Module,
        StationV2Module,
        TripV2Module,
        TripClassV2Module,
        TripBlockV2Module,
    ],
})
export class ApiV2Module {}

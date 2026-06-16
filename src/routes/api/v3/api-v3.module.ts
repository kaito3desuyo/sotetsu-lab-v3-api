import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { AgencyV3Module } from 'src/libs/agency/agency.v3.module';
import { CalendarV3Module } from 'src/libs/calendar/calendar.v3.module';
import { FormationV3Module } from 'src/libs/formation/formation.v3.module';
import { OperationSightingV3Module } from 'src/libs/operation-sighting/operation-sighting.v3.module';
import { OperationV3Module } from 'src/libs/operation/operation.v3.module';
import { RouteV3Module } from 'src/libs/route/route.v3.module';
import { ServiceV3Module } from 'src/libs/service/service.v3.module';
import { StationV3Module } from 'src/libs/station/station.v3.module';
import { TripBlockV3Module } from 'src/libs/trip-block/trip-block.v3.module';
import { TripClassV3Module } from 'src/libs/trip-class/trip-class.v3.module';
import { TripV3Module } from 'src/libs/trip/trip.v3.module';

const routes: Routes = [
    {
        path: '/v3',
        children: [
            {
                path: '/agencies',
                module: AgencyV3Module,
            },
            {
                path: '/calendars',
                module: CalendarV3Module,
            },
            {
                path: '/formations',
                module: FormationV3Module,
            },
            {
                path: '/operations',
                module: OperationV3Module,
            },
            {
                path: '/operation-sightings',
                module: OperationSightingV3Module,
            },
            {
                path: '/routes',
                module: RouteV3Module,
            },
            {
                path: '/services',
                module: ServiceV3Module,
            },
            {
                path: '/stations',
                module: StationV3Module,
            },
            {
                path: '/trip-blocks',
                module: TripBlockV3Module,
            },
            {
                path: '/trip-classes',
                module: TripClassV3Module,
            },
            {
                path: '/trips',
                module: TripV3Module,
            },
        ],
    },
];

@Module({
    imports: [
        RouterModule.register(routes),
        AgencyV3Module,
        CalendarV3Module,
        FormationV3Module,
        OperationV3Module,
        OperationSightingV3Module,
        RouteV3Module,
        ServiceV3Module,
        StationV3Module,
        TripBlockV3Module,
        TripClassV3Module,
        TripV3Module,
    ],
})
export class ApiV3Module {}

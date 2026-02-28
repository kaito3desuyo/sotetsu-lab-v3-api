import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { CalendarV3Module } from 'src/libs/calendar/calendar.v3.module';
import { FormationV3Module } from 'src/libs/formation/formation.v3.module';
import { OperationSightingV3Module } from 'src/libs/operation-sighting/operation-sighting.v3.module';
import { OperationV3Module } from 'src/libs/operation/operation.v3.module';
import { RouteV3Module } from 'src/libs/route/route.v3.module';
import { ServiceV3Module } from 'src/libs/service/service.v3.module';
import { TripClassV3Module } from 'src/libs/trip-class/trip-class.v3.module';

const routes: Routes = [
    {
        path: '/v3',
        children: [
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
                path: '/trip-classes',
                module: TripClassV3Module,
            },
        ],
    },
];

@Module({
    imports: [
        RouterModule.register(routes),
        CalendarV3Module,
        FormationV3Module,
        OperationV3Module,
        OperationSightingV3Module,
        RouteV3Module,
        ServiceV3Module,
        TripClassV3Module,
    ],
})
export class ApiV3Module {}

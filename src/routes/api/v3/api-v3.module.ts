import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { FeatureFlagV3Module } from '../../../core/modules/feature-flag/feature-flag.v3.module.js';
import { AgencyV3Module } from '../../../libs/agency/agency.v3.module.js';
import { CalendarDateV3Module } from '../../../libs/calendar/calendar-date.v3.module.js';
import { CalendarV3Module } from '../../../libs/calendar/calendar.v3.module.js';
import { FormationV3Module } from '../../../libs/formation/formation.v3.module.js';
import { OperationSightingV3Module } from '../../../libs/operation-sighting/operation-sighting.v3.module.js';
import { OperationV3Module } from '../../../libs/operation/operation.v3.module.js';
import { RouteV3Module } from '../../../libs/route/route.v3.module.js';
import { ServiceV3Module } from '../../../libs/service/service.v3.module.js';
import { StationV3Module } from '../../../libs/station/station.v3.module.js';
import { TripBlockV3Module } from '../../../libs/trip-block/trip-block.v3.module.js';
import { TripClassV3Module } from '../../../libs/trip-class/trip-class.v3.module.js';
import { TripV3Module } from '../../../libs/trip/trip.v3.module.js';

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
                path: '/calendar-dates',
                module: CalendarDateV3Module,
            },
            {
                path: '/feature-flags',
                module: FeatureFlagV3Module,
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
        CalendarDateV3Module,
        FeatureFlagV3Module,
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

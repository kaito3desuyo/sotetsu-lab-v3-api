import { Module } from '@nestjs/common';
import { RouteModule } from './route/route.module';
import { AgencyModule } from './agency/agency.module';
import { CalendarModule } from './calendar/calendar.module';
import { RouterModule, Route } from 'nest-router';
import { StationModule } from './station/station.module';
import { OperationModule } from './operation/operation.module';
import { FormationModule } from './formation/formation.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { TripModule } from './trip/trip.module';
import { ServiceModule } from './service/service.module';
import { TripOperationListModule } from './trip-operation-list/trip_operation_list.module';
import { AuthService } from './../../shared/services/auth.service';
import { OperationSightingModule } from './operation-sighting/operation-sighting.module';

const routes: Route[] = [
  {
    path: '/v1',
    children: [
      {
        path: '/agencies',
        module: AgencyModule,
      },
      {
        path: '/routes',
        module: RouteModule,
      },
      {
        path: '/calendars',
        module: CalendarModule,
      },
      {
        path: '/stations',
        module: StationModule,
      },
      {
        path: '/operations',
        module: OperationModule,
      },
      {
        path: '/operation-sightings',
        module: OperationSightingModule,
      },
      {
        path: '/formations',
        module: FormationModule,
      },
      {
        path: '/vehicles',
        module: VehicleModule,
      },
      {
        path: '/trips',
        module: TripModule,
      },
      {
        path: '/trip-operation-lists',
        module: TripOperationListModule,
      },
      {
        path: '/services',
        module: ServiceModule,
      },
    ],
  },
];

@Module({
  imports: [
    RouterModule.forRoutes(routes),
    AgencyModule,
    RouteModule,
    CalendarModule,
    StationModule,
    OperationModule,
    OperationSightingModule,
    FormationModule,
    VehicleModule,
    TripModule,
    TripOperationListModule,
    ServiceModule,
  ],
  providers: [AuthService],
})
export class ApiV1Module {}

import { Module } from '@nestjs/common';
import { RouteModule } from './route/route.module';
import { AgencyModule } from './agency/agency.module';
import { CalenderModule } from './calender/calender.module';
import { RouterModule, Route } from 'nest-router';
import { StationModule } from './station/station.module';
import { OperationModule } from './operation/operation.module';
import { FormationModule } from './formation/formation.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { TripModule } from './trip/trip.module';

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
        path: '/calenders',
        module: CalenderModule,
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
        path: '/formations',
        module: FormationModule,
      },
      {
        path: '/vehicles',
        module: VehicleModule,
      },
      {
        path: '/trips',
        module: TripModule
      }
    ],
  },
];

@Module({
  imports: [
    RouterModule.forRoutes(routes),
    AgencyModule,
    RouteModule,
    CalenderModule,
    StationModule,
    OperationModule,
    FormationModule,
    VehicleModule,
    TripModule
  ],
})
export class ApiV1Module {}

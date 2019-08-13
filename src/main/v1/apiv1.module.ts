import { Module } from '@nestjs/common';
import { RouteModule } from './route/route.module';
import { AgencyModule } from './agency/agency.module';
import { CalenderModule } from './calender/calender.module';
import { RouterModule, Route } from 'nest-router';
import { StationModule } from './station/station.module';
import { OperationModule } from './operation/operation.module';
import { FormationModule } from './formation/formation.module';

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
  ],
})
export class ApiV1Module {}

import { Module } from '@nestjs/common';
import { RouteModule } from './route/route.module';
import { AgencyModule } from './agency/agency.module';
import { CalenderModule } from './calender/calender.module';
import { RouterModule, Route } from 'nest-router';

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
    ],
  },
];

@Module({
  imports: [
    RouterModule.forRoutes(routes),
    AgencyModule,
    RouteModule,
    CalenderModule,
  ],
})
export class ApiV1Module {}

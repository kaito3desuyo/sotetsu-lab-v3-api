import { Route, RouterModule } from 'nest-router';
import { Module } from '@nestjs/common';
import { FormationV2Module } from './formation/formation.module';
import { AuthService } from '../../shared/services/auth.service';

const routes: Route[] = [
  {
    path: '/v2',
    children: [
      {
        path: '/formations',
        module: FormationV2Module,
      },
    ],
  },
];

@Module({
  imports: [RouterModule.forRoutes(routes), FormationV2Module],
  providers: [AuthService],
})
export class ApiV2Module {}

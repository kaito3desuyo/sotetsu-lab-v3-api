import { Route, RouterModule } from 'nest-router';
import { Module } from '@nestjs/common';
import { FormationV2Module } from './formation/formation.module';
import { AuthService } from '../../shared/services/auth.service';
import { OperationSightingV2Module } from './operation-sighting/operation-sighting.v2.module';
import { OperationV2Module } from './operation/operation.v2.module';

const routes: Route[] = [
    {
        path: '/v2',
        children: [
            {
                path: '/formations',
                module: FormationV2Module,
            },
            {
                path: '/operations',
                module: OperationV2Module,
            },
            {
                path: '/operation-sightings',
                module: OperationSightingV2Module,
            },
        ],
    },
];

@Module({
    imports: [
        RouterModule.forRoutes(routes),
        FormationV2Module,
        OperationV2Module,
        OperationSightingV2Module,
    ],
    providers: [AuthService],
})
export class ApiV2Module {}

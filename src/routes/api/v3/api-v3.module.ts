import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { OperationSightingV3Module } from 'src/libs/operation-sighting/operation-sighting.v3.module';
import { OperationV3Module } from 'src/libs/operation/operation.v3.module';

const routes: Routes = [
    {
        path: '/v3',
        children: [
            {
                path: '/operations',
                module: OperationV3Module,
            },
            {
                path: '/operation-sightings',
                module: OperationSightingV3Module,
            },
        ],
    },
];

@Module({
    imports: [
        RouterModule.register(routes),
        OperationV3Module,
        OperationSightingV3Module,
    ],
})
export class ApiV3Module {}

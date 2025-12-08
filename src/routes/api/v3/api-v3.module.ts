import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { OperationSightingV3Module } from 'src/libs/operation-sighting/operation-sighting.v3.module';

const routes: Routes = [
    {
        path: '/v3',
        children: [
            {
                path: '/operation-sightings',
                module: OperationSightingV3Module,
            },
        ],
    },
];

@Module({
    imports: [RouterModule.register(routes), OperationSightingV3Module],
})
export class ApiV3Module {}

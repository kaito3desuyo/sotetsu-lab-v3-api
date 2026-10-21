import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormationModel } from './infrastructure/models/formation.model.js';
import { VehicleFormationModel } from './infrastructure/models/vehicle-formation.model.js';
import { FormationQuery } from './infrastructure/queries/formation.query.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([FormationModel, VehicleFormationModel]),
    ],
    exports: [FormationQuery],
    providers: [FormationQuery],
})
export class FormationLibsModule {}

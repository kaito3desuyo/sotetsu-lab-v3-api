import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormationModel } from './infrastructure/models/formation.model';
import { VehicleFormationModel } from './infrastructure/models/vehicle-formation.model';
import { FormationQuery } from './infrastructure/queries/formation.query';

@Module({
    imports: [
        TypeOrmModule.forFeature([FormationModel, VehicleFormationModel]),
    ],
    exports: [FormationQuery],
    providers: [FormationQuery],
})
export class FormationLibsModule {}

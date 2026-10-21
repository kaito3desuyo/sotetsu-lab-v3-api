import { Module } from '@nestjs/common';
import { FormationLibsModule } from './formation.libs.module.js';
import { FormationV3Controller } from './presentation/formation.v3.controller.js';
import { FormationV3Service } from './usecase/formation.v3.service.js';

@Module({
    imports: [FormationLibsModule],
    controllers: [FormationV3Controller],
    providers: [FormationV3Service],
})
export class FormationV3Module {}

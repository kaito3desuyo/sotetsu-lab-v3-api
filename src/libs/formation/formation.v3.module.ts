import { Module } from '@nestjs/common';
import { FormationLibsModule } from './formation.libs.module';
import { FormationV3Controller } from './presentation/formation.v3.controller';
import { FormationV3Service } from './usecase/formation.v3.service';

@Module({
    imports: [FormationLibsModule],
    controllers: [FormationV3Controller],
    providers: [FormationV3Service],
})
export class FormationV3Module {}

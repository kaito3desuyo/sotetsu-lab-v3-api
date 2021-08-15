import { Module } from '@nestjs/common';
import { FormationLibsModule } from './formation.libs.module';
import { FormationV2Controller } from './presentation/formation.v2.controller';
import { FormationV2Service } from './usecase/formation.v2.service';

@Module({
    imports: [FormationLibsModule],
    controllers: [FormationV2Controller],
    providers: [FormationV2Service],
})
export class FormationV2Module {}

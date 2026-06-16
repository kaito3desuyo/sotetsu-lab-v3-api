import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { FormationDetailsDto } from '../usecase/dtos/formation-details.dto';
import { FormationV3Service } from '../usecase/formation.v3.service';
import { FormationFindManyBySpecificPeriodParam } from '../usecase/params/formation-find-many-by-specific-period.param';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class FormationV3Controller {
    constructor(private readonly formationV3Service: FormationV3Service) {}

    @Get('/as/of/:date')
    async findManyBySpecificDate(
        @Param('date') date: string,
    ): Promise<FormationDetailsDto[]> {
        const result = await this.formationV3Service.findManyBySpecificDate({
            date,
        });

        return result;
    }

    @Get('/from/:startDate/to/:endDate')
    async findManyBySpecificPeriod(
        @Param() params: FormationFindManyBySpecificPeriodParam,
    ): Promise<FormationDetailsDto[]> {
        const result =
            await this.formationV3Service.findManyBySpecificPeriod(params);

        return result;
    }
}

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CACHE_CONTROL } from '../../../core/modules/cache-control/cache-control.constants.js';
import { CacheControl } from '../../../core/modules/cache-control/cache-control.decorator.js';
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { FormationDetailsDto } from '../usecase/dtos/formation-details.dto.js';
import { FormationV3Service } from '../usecase/formation.v3.service.js';
import { FormationFindManyBySpecificPeriodParam } from '../usecase/params/formation-find-many-by-specific-period.param.js';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class FormationV3Controller {
    constructor(private readonly formationV3Service: FormationV3Service) {}

    /** `include`・`fields` で返す関連・列を選べる（docs/adr/0010-v3-include-and-fields.md） */
    @Get('/as/of/:date')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findManyBySpecificDate(
        @Param('date') date: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<FormationDetailsDto[] | Record<string, unknown>[]> {
        const result = await this.formationV3Service.findManyBySpecificDate({
            date,
            include,
            fields,
        });

        return result;
    }

    /** `include`・`fields` で返す関連・列を選べる（docs/adr/0010-v3-include-and-fields.md） */
    @Get('/from/:startDate/to/:endDate')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findManyBySpecificPeriod(
        @Param() params: FormationFindManyBySpecificPeriodParam,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<FormationDetailsDto[] | Record<string, unknown>[]> {
        const result = await this.formationV3Service.findManyBySpecificPeriod({
            ...params,
            include,
            fields,
        });

        return result;
    }
}

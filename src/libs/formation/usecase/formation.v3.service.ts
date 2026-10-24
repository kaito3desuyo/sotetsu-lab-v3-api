import { Injectable } from '@nestjs/common';
import { parseSelection } from '../../../core/utils/selection/parse-selection.js';
import { FormationQuery } from '../infrastructure/queries/formation.query.js';
import { FormationDetailsDto } from './dtos/formation-details.dto.js';
import {
    FORMATIONS_AS_OF_SELECTION_TREE,
    FORMATIONS_BY_PERIOD_SELECTION_TREE,
} from './formation-selection.js';
import { FormationFindManyBySpecificPeriodParam } from './params/formation-find-many-by-specific-period.param.js';

@Injectable()
export class FormationV3Service {
    constructor(private readonly formationQuery: FormationQuery) {}

    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findManyBySpecificDate(params: {
        date: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<FormationDetailsDto[] | Record<string, unknown>[]> {
        const { date, include, fields } = params;
        const selection = parseSelection(
            { include, fields },
            FORMATIONS_AS_OF_SELECTION_TREE,
        );
        if (!selection) {
            return this.formationQuery.findManyBySpecificDate({ date });
        }
        return this.formationQuery.findManyBySpecificDateWithSelection(
            { date },
            selection,
        );
    }

    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findManyBySpecificPeriod(
        params: FormationFindManyBySpecificPeriodParam & {
            include?: unknown;
            fields?: unknown;
        },
    ): Promise<FormationDetailsDto[] | Record<string, unknown>[]> {
        const { startDate, endDate, include, fields } = params;
        const selection = parseSelection(
            { include, fields },
            FORMATIONS_BY_PERIOD_SELECTION_TREE,
        );
        if (!selection) {
            return this.formationQuery.findManyBySpecificPeriod({
                startDate,
                endDate,
            });
        }
        return this.formationQuery.findManyBySpecificPeriodWithSelection(
            { startDate, endDate },
            selection,
        );
    }
}

import {
    ArrayMaxSize,
    ArrayNotEmpty,
    IsArray,
    IsOptional,
    IsString,
} from 'class-validator';
import { CommaList } from '../../../../core/validators/comma-list.js';
import { IsInstant } from '../../../../core/validators/date-validators.js';
import { NUMBER_LIST_MAX } from '../../../../core/validators/limits.js';

/** `?formationNumbers=10701,…&searchTime=` */
export class FormationNumbersTimeCrossSectionQuery {
    @CommaList()
    @IsArray()
    @ArrayNotEmpty()
    @ArrayMaxSize(NUMBER_LIST_MAX)
    @IsString({ each: true })
    formationNumbers!: string[];

    @IsOptional()
    @IsInstant()
    searchTime?: string;
}

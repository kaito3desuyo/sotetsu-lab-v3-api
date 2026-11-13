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

/** `?operationNumbers=11,12,…&searchTime=` */
export class OperationNumbersTimeCrossSectionQuery {
    @CommaList()
    @IsArray()
    @ArrayNotEmpty()
    @ArrayMaxSize(NUMBER_LIST_MAX)
    @IsString({ each: true })
    operationNumbers!: string[];

    @IsOptional()
    @IsInstant()
    searchTime?: string;
}

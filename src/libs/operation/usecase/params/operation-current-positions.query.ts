import {
    ArrayMaxSize,
    ArrayNotEmpty,
    IsArray,
    IsOptional,
    IsUUID,
} from 'class-validator';
import { CommaList } from '../../../../core/validators/comma-list.js';
import { IsInstant } from '../../../../core/validators/date-validators.js';
import { NUMBER_LIST_MAX } from '../../../../core/validators/limits.js';

/** `?operationIds=a,b,c&searchTime=` */
export class OperationCurrentPositionsQuery {
    @CommaList()
    @IsArray()
    @ArrayNotEmpty()
    @ArrayMaxSize(NUMBER_LIST_MAX)
    @IsUUID('all', { each: true })
    operationIds!: string[];

    @IsOptional()
    @IsInstant()
    searchTime?: string;
}

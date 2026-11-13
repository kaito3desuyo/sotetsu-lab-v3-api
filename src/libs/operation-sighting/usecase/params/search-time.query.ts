import { IsOptional } from 'class-validator';
import { IsInstant } from '../../../../core/validators/date-validators.js';

/** `?searchTime=`。時差の付いた ISO 8601 */
export class SearchTimeQuery {
    @IsOptional()
    @IsInstant()
    searchTime?: string;
}

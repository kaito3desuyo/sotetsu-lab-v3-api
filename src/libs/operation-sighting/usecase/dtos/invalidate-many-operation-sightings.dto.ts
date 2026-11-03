import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';
import {
    INVALIDATE_REASON_MAX_LENGTH,
    INVALIDATE_SIGHTINGS_MAX_COUNT,
} from '../../operation-sighting.constants.js';

/** まとめての無効化の body */
export class InvalidateManyOperationSightingsDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(INVALIDATE_SIGHTINGS_MAX_COUNT)
    @IsUUID(undefined, { each: true })
    ids!: string[];

    @IsString()
    @MinLength(1)
    @MaxLength(INVALIDATE_REASON_MAX_LENGTH)
    reason!: string;
}

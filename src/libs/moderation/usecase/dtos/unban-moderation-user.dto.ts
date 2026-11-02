import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ROLE_CHANGE_REASON_MAX_LENGTH } from '../../moderation.constants.js';

/** BAN の解除の body。理由は任意 */
export class UnbanModerationUserDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(ROLE_CHANGE_REASON_MAX_LENGTH)
    reason?: string;
}

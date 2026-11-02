import { IsString, MaxLength, MinLength } from 'class-validator';
import { ROLE_CHANGE_REASON_MAX_LENGTH } from '../../moderation.constants.js';

/** BAN の body。理由は必須 */
export class BanModerationUserDto {
    @IsString()
    @MinLength(1)
    @MaxLength(ROLE_CHANGE_REASON_MAX_LENGTH)
    reason!: string;
}

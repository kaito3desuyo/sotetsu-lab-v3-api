import { IsUUID } from 'class-validator';

export class ModerationUserIdParam {
    @IsUUID()
    userId!: string;
}

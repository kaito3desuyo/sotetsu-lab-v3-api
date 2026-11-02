import { IsUUID } from 'class-validator';

export class ModerationSightingIdParam {
    @IsUUID()
    id!: string;
}

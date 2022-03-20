import { IsISO8601 } from 'class-validator';

export class FormationFindManyBySpecificDateParam {
    @IsISO8601()
    date: string;
}

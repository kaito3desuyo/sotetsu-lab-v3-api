import { Matches } from 'class-validator';

/** `/number/:formationNumber`。英数字だけ、1〜16 文字 */
export class FormationNumberParam {
    @Matches(/^[0-9A-Za-z]{1,16}$/, {
        message: 'formationNumber must be 1 to 16 alphanumeric characters',
    })
    formationNumber!: string;
}

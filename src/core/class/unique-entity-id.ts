import { v4 as uuid } from 'uuid';
import { Identifier } from './identifier';

export class UniqueEntityId extends Identifier<string> {
    constructor(id?: string) {
        super(id ?? uuid());
    }
}

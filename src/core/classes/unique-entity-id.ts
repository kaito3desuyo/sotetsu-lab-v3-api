import { v4 as uuid } from 'uuid';
import { Identifier } from './identifier.js';

export class UniqueEntityId extends Identifier<string> {
    constructor(id?: string) {
        super(id ?? uuid());
    }
}

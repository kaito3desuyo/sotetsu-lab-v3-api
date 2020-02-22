import { Identifier } from './identifier';
import uuid from 'uuid/v4';

export class UniqueEntityId extends Identifier<string | number> {
    constructor(id?: string | number) {
        super(id ? id : uuid());
    }
}

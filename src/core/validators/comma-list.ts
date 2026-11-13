import { Transform } from 'class-transformer';
import { parseCommaList } from '../utils/comma-list.js';

/** カンマ区切りの文字列を `string[]` にする。未指定は undefined のまま */
export const CommaList = (): PropertyDecorator =>
    Transform(({ value }) =>
        value === undefined ? undefined : parseCommaList(value),
    );

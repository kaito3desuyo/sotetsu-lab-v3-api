import { Transform } from 'class-transformer';
import { parseCommaList } from '../utils/comma-list.js';

/** カンマ区切りの文字列を `string[]` にする。文字列以外（未指定・配列・オブジェクト）はそのまま返し、後段の検証に任せる */
export const CommaList = (): PropertyDecorator =>
    Transform(({ value }) =>
        typeof value === 'string' ? parseCommaList(value) : value,
    );

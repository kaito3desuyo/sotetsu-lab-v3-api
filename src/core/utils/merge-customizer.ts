import { has, isArray, isEqual } from 'lodash';

export function crudReqMergeCustomizer(
    a: unknown,
    b: unknown,
): unknown[] | void {
    if (isArray(a) && isArray(b)) {
        return a.concat(
            b.filter(
                (o) =>
                    !a.some(
                        (o2) =>
                            has(o, 'field') &&
                            has(o2, 'field') &&
                            isEqual(o.field, o2.field),
                    ),
            ),
        );
    }
}

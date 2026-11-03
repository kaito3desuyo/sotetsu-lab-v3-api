import { SelectQueryBuilder } from 'typeorm';
import { UserRoleChangeModel } from '../models/user-role-change.model.js';

/**
 * 「BAN されている」の定義（1 か所）: 今 viewer で、かつ viewer にした記録がある。
 * 記録の無い viewer（SQL で直した人など）は BAN とは呼ばない。:viewerRole を呼び出し側で渡す。
 * 親の profiles は alias "p"
 */
export function bannedSql(qb: SelectQueryBuilder<any>): string {
    const exists = qb
        .subQuery()
        .select('1')
        .from(UserRoleChangeModel, 'rc')
        .where('rc.userId = "p"."user_id"')
        .andWhere('rc.toRole = :viewerRole')
        .getQuery();

    return `"p"."role" = :viewerRole AND EXISTS ${exists}`;
}

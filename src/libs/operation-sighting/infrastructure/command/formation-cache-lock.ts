import type { EntityManager } from 'typeorm';

/** lock の待ちの上限。超えると Postgres が 55P03（lock_not_available）で失敗させる */
export const FORMATION_CACHE_LOCK_TIMEOUT = '1000ms';

/**
 * 編成ごとの「最新の目撃」キャッシュを触る書き込みを並べる advisory lock。
 * トランザクションの終わり（commit / rollback）で自動で外れる。
 * キャッシュ行がまだ無い編成も守れる（SELECT ... FOR UPDATE は無い行を押さえられない）。
 * 渡す manager は、このあとの読み直しと保存に使うトランザクションのものにする。
 *
 * 流す順番:
 * 1. SET LOCAL lock_timeout: 以降の待ちに上限を置く。必ず SET LOCAL（素の SET は Supavisor の共有 backend に残る）。
 * 2. advisory lock: 同じ編成の書き込み同士を並べる。
 * 3. LOCK TABLE ... ROW EXCLUSIVE: rebuild-latest-cache（SHARE ROW EXCLUSIVE）との競合を閉じる。
 *    ROW EXCLUSIVE 同士はぶつからないので、普段の書き込みは並ばない。
 *
 * lock の後の読み直しが他のトランザクションの commit を見られるのは READ COMMITTED だから。
 * REPEATABLE READ 以上にすると壊れる。
 */
export async function lockFormationCache(
    manager: EntityManager,
    formationNumber: string,
): Promise<void> {
    await manager.query(
        `SET LOCAL lock_timeout = '${FORMATION_CACHE_LOCK_TIMEOUT}'`,
    );
    await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`operation-sighting-latest-cache:${formationNumber}`],
    );
    await manager.query(
        'LOCK TABLE operation_sighting_latest_caches IN ROW EXCLUSIVE MODE',
    );
}

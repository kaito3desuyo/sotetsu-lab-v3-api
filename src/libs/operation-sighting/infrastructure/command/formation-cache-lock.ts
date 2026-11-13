import type { EntityManager } from 'typeorm';

/**
 * 編成ごとの「最新の目撃」キャッシュを触る書き込みを並べる advisory lock。
 * トランザクションの終わり（commit / rollback）で自動で外れる。
 * キャッシュ行がまだ無い編成も守れる（SELECT ... FOR UPDATE は無い行を押さえられない）。
 * 渡す manager は、このあとの読み直しと保存に使うトランザクションのものにする。
 */
export async function lockFormationCache(
    manager: EntityManager,
    formationNumber: string,
): Promise<void> {
    await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`operation-sighting-latest-cache:${formationNumber}`],
    );
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 使われなくなった匿名利用者を pg_cron で毎日消す（ADR-0017）。
 * 作ってから 30 日、セッションが最後に使われてからも 30 日を過ぎた匿名利用者が対象。
 * cron.schedule は同じ持ち主・同じ名前のジョブを上書きするので、もう入っている DB に流しても二重にならない。
 */
export class ScheduleIdleAnonymousUserCleanup1794389397371 implements MigrationInterface {
    name = 'ScheduleIdleAnonymousUserCleanup1794389397371';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog`,
        );
        await queryRunner.query(`
            SELECT cron.schedule(
                'delete-idle-anonymous-users',
                '0 19 * * *',
                $job$
                DELETE FROM auth.users u
                WHERE u.is_anonymous IS TRUE
                  AND u.created_at < now() - interval '30 days'
                  AND NOT EXISTS (
                      SELECT 1 FROM auth.sessions s
                      WHERE s.user_id = u.id
                        AND coalesce(s.refreshed_at, s.updated_at, s.created_at) > now() - interval '30 days'
                  )
                $job$
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 拡張はほかのジョブも持つので消さない
        await queryRunner.query(
            `SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'delete-idle-anonymous-users' AND username = current_user`,
        );
    }
}

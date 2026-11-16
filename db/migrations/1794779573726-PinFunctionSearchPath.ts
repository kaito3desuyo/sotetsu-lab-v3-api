import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * public の関数 5 本の search_path を固定する（Supabase の advisor「Function Search Path Mutable」）。
 * 固定していないと、呼び出す側の search_path に置いた同じ名前の表や関数が先に見つかりうる。
 * Auth の 2 本の hook は中で public. を付けて書いているので空にする。
 * トリガーの 3 本は表の名前を schema なしで書いているので public にする（空にすると表が見つからない）。
 */
const EMPTY_PATH = [
    'public.custom_access_token_hook(jsonb)',
    'public.before_user_created_hook(jsonb)',
];
const PUBLIC_PATH = [
    'public.delete_times_on_update_trips_table()',
    'public.delete_trip_operation_lists_on_update_trips_table()',
    'public.delete_trips_on_update_trip_blocks_table()',
];

export class PinFunctionSearchPath1794779573726 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const fn of EMPTY_PATH) {
            await queryRunner.query(
                `ALTER FUNCTION ${fn} SET search_path = ''`,
            );
        }
        for (const fn of PUBLIC_PATH) {
            await queryRunner.query(
                `ALTER FUNCTION ${fn} SET search_path = public`,
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        for (const fn of [...EMPTY_PATH, ...PUBLIC_PATH]) {
            await queryRunner.query(`ALTER FUNCTION ${fn} RESET search_path`);
        }
    }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 子の行を消す手作りのトリガー 3 本と関数 3 本を消す。
 * トリガーは、親を cascade 付きで save したときに配列から外れた子に出る
 * 「親の id を NULL にする UPDATE」を受けて、行を消していた。
 * TypeORM 1.x は外部キー列が NOT NULL（times.trip_id・trip_operation_lists.trip_id・
 * trips.trip_block_id）だとその UPDATE を出さずに DELETE するので、トリガーはもう働いていない。
 * 消し方は orphanedRowAction: 'delete'（TripModel.tripBlock・TimeModel.trip・
 * TripOperationListModel.trip の @ManyToOne）としてモデルに書いた。
 *
 * 流す順番: 念のため、orphanedRowAction を含むコードを先にデプロイしてから流す。（ADR-0018）
 */
const TRIGGERS = [
    {
        name: 'delete_times_on_update_trips_table',
        table: 'times',
        column: 'trip_id',
        deleteFrom: 'times',
    },
    {
        name: 'delete_trip_operation_lists_on_update_trips_table',
        table: 'trip_operation_lists',
        column: 'trip_id',
        deleteFrom: 'trip_operation_lists',
    },
    {
        name: 'delete_trips_on_update_trip_blocks_table',
        table: 'trips',
        column: 'trip_block_id',
        deleteFrom: 'trips',
    },
];

export class DropOrphanDeleteTriggers1794867125005 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const t of TRIGGERS) {
            await queryRunner.query(
                `DROP TRIGGER IF EXISTS ${t.name} ON public.${t.table}`,
            );
            await queryRunner.query(
                `DROP FUNCTION IF EXISTS public.${t.name}()`,
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        for (const t of TRIGGERS) {
            await queryRunner.query(
                `CREATE OR REPLACE FUNCTION public.${t.name}() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$ BEGIN DELETE FROM ${t.deleteFrom} WHERE id = OLD.id; RETURN NULL; END $function$`,
            );
            await queryRunner.query(
                `CREATE TRIGGER ${t.name} BEFORE UPDATE ON public.${t.table} FOR EACH ROW WHEN ((new.${t.column} IS NULL)) EXECUTE FUNCTION ${t.name}()`,
            );
        }
    }
}

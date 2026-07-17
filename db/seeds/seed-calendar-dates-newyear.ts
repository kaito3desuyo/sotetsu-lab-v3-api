import 'reflect-metadata';
import { newYearDays } from '../../src/core/utils/day-of-week';
import { AppDataSource } from '../../src/core/utils/data-source';
import { CalendarModel } from '../../src/libs/calendar/infrastructure/models/calendar.model';
import { CalendarDateModel } from '../../src/libs/calendar/infrastructure/models/calendar-date.model';
import { CalendarValidityRow } from '../../src/libs/calendar/infrastructure/seeds/build-holiday-calendar-date-rows';
import { buildNewYearCalendarDateRows } from '../../src/libs/calendar/infrastructure/seeds/build-newyear-calendar-date-rows';

const INSERT_CHUNK_SIZE = 500;

interface CliArgs {
    from?: string;
    to?: string;
    dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = { dryRun: false };

    for (const arg of argv) {
        if (arg === '--dry-run') {
            args.dryRun = true;
        } else if (arg.startsWith('--from=')) {
            args.from = arg.slice('--from='.length);
        } else if (arg.startsWith('--to=')) {
            args.to = arg.slice('--to='.length);
        }
    }

    return args;
}

function toCalendarValidityRow(calendar: CalendarModel): CalendarValidityRow {
    return {
        id: calendar.id,
        startDate: calendar.startDate,
        endDate: calendar.endDate,
        sunday: calendar.sunday,
        monday: calendar.monday,
        tuesday: calendar.tuesday,
        wednesday: calendar.wednesday,
        thursday: calendar.thursday,
        friday: calendar.friday,
        saturday: calendar.saturday,
    };
}

/**
 * api `core/utils/day-of-week.ts` の `newYearDays`（毎年固定の年末年始 MM-DD）を
 * calendar_dates へ移行するシード（T7.1）。
 * 移行後も day-of-week.ts の newYearDays 自体は当面残し、
 * 実 DB でシード適用を確認できてから撤去する（今回は撤去しない）。
 *
 * newYearDays は年を持たない MM-DD のため、endDate が無期限のカレンダーが
 * 存在する場合は --to（または他カレンダーの最大 endDate）で展開上限を
 * 決定できないとエラーになる。必要に応じて --from/--to を指定すること。
 */
async function main(): Promise<void> {
    const { from, to, dryRun } = parseArgs(process.argv.slice(2));

    console.log(
        `newYearDays から ${newYearDays.length} 件の年末年始 MM-DD を読み込みました`,
    );

    await AppDataSource.initialize();

    try {
        const calendars = await AppDataSource.getRepository(
            CalendarModel,
        ).find();
        const calendarValidityRows = calendars.map(toCalendarValidityRow);

        const rows = buildNewYearCalendarDateRows({
            newYearMonthDays: newYearDays,
            calendars: calendarValidityRows,
            from,
            to,
        });

        console.log(
            `挿入予定: ${rows.length} 件（既存の calendar_dates と衝突する行は ON CONFLICT DO NOTHING でスキップされます）`,
        );

        if (dryRun) {
            console.log('--dry-run のため DB への書き込みは行いません');
            for (const row of rows.slice(0, 20)) {
                console.log(
                    `  calendarId=${row.calendarId} date=${row.date} exceptionType=${row.exceptionType} memo=${row.memo}`,
                );
            }
            if (rows.length > 20) {
                console.log(`  ...ほか ${rows.length - 20} 件`);
            }
            return;
        }

        await insertCalendarDateRows(rows);
        console.log('年末年始の calendar_dates シードが完了しました');
    } finally {
        await AppDataSource.destroy();
    }
}

async function insertCalendarDateRows(
    rows: Array<{
        calendarId: string;
        date: string;
        exceptionType: number;
        memo: string;
    }>,
): Promise<void> {
    for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
        const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE);
        if (chunk.length === 0) continue;

        await AppDataSource.createQueryBuilder()
            .insert()
            .into(CalendarDateModel)
            .values(chunk)
            .onConflict('("calendar_id", "date") DO NOTHING')
            .execute();
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

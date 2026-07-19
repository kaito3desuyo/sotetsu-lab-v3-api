import 'reflect-metadata';
import { specialCalendarDays } from '../../src/core/utils/day-of-week';
import { AppDataSource } from '../../src/core/utils/data-source';
import { CalendarModel } from '../../src/libs/calendar/infrastructure/models/calendar.model';
import { CalendarDateModel } from '../../src/libs/calendar/infrastructure/models/calendar-date.model';
import {
    CalendarDateSeedRow,
    CalendarValidityRow,
} from '../../src/libs/calendar/infrastructure/seeds/build-holiday-calendar-date-rows';
import { buildSpecialCalendarDateRows } from '../../src/libs/calendar/infrastructure/seeds/build-special-calendar-date-rows';

const INSERT_CHUNK_SIZE = 500;

interface CliArgs {
    dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
    return { dryRun: argv.includes('--dry-run') };
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
 * api `core/utils/day-of-week.ts` の `specialCalendarDays` ハードコードを
 * calendar_dates へ移行するシード（D-13）。
 * 移行後も day-of-week.ts の specialCalendarDays 自体は当面残し、
 * 実 DB でシード適用を確認できてから撤去する（今回は撤去しない）。
 */
async function main(): Promise<void> {
    const { dryRun } = parseArgs(process.argv.slice(2));

    console.log(
        `specialCalendarDays から ${specialCalendarDays.length} 件の特別日を読み込みました`,
    );

    await AppDataSource.initialize();

    try {
        const calendars = await AppDataSource.getRepository(
            CalendarModel,
        ).find();
        const calendarValidityRows = calendars.map(toCalendarValidityRow);

        const rows = buildSpecialCalendarDateRows({
            specialDates: specialCalendarDays,
            calendars: calendarValidityRows,
        });

        console.log(
            `挿入予定: ${rows.length} 件（既存の calendar_dates と衝突する行は ON CONFLICT DO NOTHING でスキップされます）`,
        );

        if (dryRun) {
            console.log('--dry-run のため DB への書き込みは行いません');
            for (const row of rows) {
                console.log(
                    `  calendarId=${row.calendarId} date=${row.date} exceptionType=${row.exceptionType} memo=${row.memo}`,
                );
            }
            return;
        }

        await insertCalendarDateRows(rows);
        console.log('特別日の calendar_dates シードが完了しました');
    } finally {
        await AppDataSource.destroy();
    }
}

async function insertCalendarDateRows(
    rows: CalendarDateSeedRow[],
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

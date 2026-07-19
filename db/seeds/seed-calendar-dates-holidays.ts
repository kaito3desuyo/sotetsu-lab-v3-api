import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AppDataSource } from '../../src/core/utils/data-source';
import { CalendarModel } from '../../src/libs/calendar/infrastructure/models/calendar.model';
import { CalendarDateModel } from '../../src/libs/calendar/infrastructure/models/calendar-date.model';
import {
    buildHolidayCalendarDateRows,
    CalendarDateSeedRow,
    CalendarValidityRow,
} from '../../src/libs/calendar/infrastructure/seeds/build-holiday-calendar-date-rows';
import { parseSyukujitsuCsvBuffer } from '../../src/libs/calendar/infrastructure/seeds/parse-syukujitsu-csv';

const CSV_PATH = join(__dirname, 'data', 'syukujitsu.csv');
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

async function main(): Promise<void> {
    const { from, to, dryRun } = parseArgs(process.argv.slice(2));

    let csvBuffer: Buffer;
    try {
        csvBuffer = readFileSync(CSV_PATH);
    } catch (error) {
        console.error(
            `祝日 CSV が見つかりません: ${CSV_PATH}\n` +
                '内閣府「国民の祝日」CSV（Shift_JIS）を db/seeds/data/syukujitsu.csv に配置してください。',
        );
        throw error;
    }

    const holidays = parseSyukujitsuCsvBuffer(csvBuffer);
    console.log(`祝日 CSV から ${holidays.length} 件の祝日を読み込みました`);

    await AppDataSource.initialize();

    try {
        const calendars = await AppDataSource.getRepository(
            CalendarModel,
        ).find();
        const calendarValidityRows = calendars.map(toCalendarValidityRow);

        const rows = buildHolidayCalendarDateRows({
            holidayDates: holidays.map((h) => h.date),
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
        console.log('祝日の calendar_dates シードが完了しました');
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

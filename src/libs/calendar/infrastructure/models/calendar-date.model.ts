import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { CalendarModel } from './calendar.model';

/**
 * GTFS calendar_dates.txt 相当。
 * 1 = 追加（臨時運行）: 曜日規則では非運行の日に、当該カレンダーを有効にする
 * 2 = 除外（運休）: 曜日規則では運行の日に、当該カレンダーを無効にする
 */
export const CALENDAR_DATE_EXCEPTION_TYPE_ADDED = 1;
export const CALENDAR_DATE_EXCEPTION_TYPE_REMOVED = 2;

export type CalendarDateExceptionType =
    | typeof CALENDAR_DATE_EXCEPTION_TYPE_ADDED
    | typeof CALENDAR_DATE_EXCEPTION_TYPE_REMOVED;

@Entity({
    name: 'calendar_dates',
})
@Index(['calendarId', 'date'], { unique: true })
@Index(['date'])
export class CalendarDateModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    calendarId: string;

    @Column('date')
    date: string;

    @Column('smallint')
    exceptionType: CalendarDateExceptionType;

    @Column('varchar', { nullable: true })
    memo: string | null;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt: Date;

    @ManyToOne(() => CalendarModel)
    @JoinColumn({ name: 'calendar_id' })
    readonly calendar?: CalendarModel;
}

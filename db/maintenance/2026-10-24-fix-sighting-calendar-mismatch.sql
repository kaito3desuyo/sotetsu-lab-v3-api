-- M6: 平日・土休日の取り違えの付け替え（下書き・2026-10-24）
-- 本番で流すのはユーザー。Supabase の SQL エディタで上から順に、1 区切りずつ流す。
-- 流す前の件数（2026-10-24 06:5x 時点）: 479 件、全件 target_operation_id あり、効くダイヤが 2 つ以上の日は 0。
-- 重複する目撃（同じ人が正しいダイヤに入れ直したもの）も両方残す（2026-10-24 ユーザー決定）。

-- ① 付け替えの一覧を表に残す（戻すときに使う。片付けは ⑤）
create table public.m6_fix_20261024 as
with s as (
    select
        os.id as sighting_id,
        os.sighting_time,
        ((os.sighting_time at time zone 'Asia/Tokyo') - interval '4 hours')::date as base_date,
        o.id as operation_id,
        o.operation_number,
        o.calendar_id
    from operation_sightings os
    join operations o on o.id = os.operation_id
),
d as (
    select distinct base_date from s
),
effective as (
    select d.base_date, c.id as calendar_id
    from d
    join calendars c
        on (c.start_date <= d.base_date or c.start_date is null)
       and (c.end_date >= d.base_date or c.end_date is null)
    left join calendar_dates cd
        on cd.calendar_id = c.id and cd.date = d.base_date
    where (
            case extract(isodow from d.base_date)::int
                when 1 then c.monday when 2 then c.tuesday when 3 then c.wednesday
                when 4 then c.thursday when 5 then c.friday when 6 then c.saturday
                else c.sunday
            end
            and coalesce(cd.exception_type, 0) <> 2
          )
       or cd.exception_type = 1
),
effective_count as (
    select base_date, count(*) as n, min(calendar_id::text)::uuid as only_calendar_id
    from effective
    group by base_date
)
select
    s.sighting_id,
    s.sighting_time,
    s.base_date,
    s.operation_number,
    s.operation_id as wrong_operation_id,
    s.calendar_id as wrong_calendar_id,
    ec.n as effective_calendars,
    case when ec.n = 1 then t.id end as target_operation_id
from s
left join effective e
    on e.base_date = s.base_date and e.calendar_id = s.calendar_id
left join effective_count ec on ec.base_date = s.base_date
left join operations t
    on ec.n = 1 and t.calendar_id = ec.only_calendar_id and t.operation_number = s.operation_number
where e.calendar_id is null;

-- ② 件数を確かめる。n = 479、with_target = 479 でなければ止めて相談
select count(*) as n, count(target_operation_id) as with_target from public.m6_fix_20261024;

-- ③ 付け替える
begin;
update operation_sightings os
set operation_id = f.target_operation_id,
    updated_at = now()
from public.m6_fix_20261024 f
where os.id = f.sighting_id
  and os.operation_id <> f.target_operation_id
  and f.target_operation_id is not null;
-- 「UPDATE 479」と出たら commit、違えば rollback
commit;

-- ④ db/maintenance/detect-sighting-calendar-mismatch.sql をもう一度流し、0 行になるのを確かめる。
--    そのあと api で最新目撃のキャッシュを作り直す（サンドボックスの外で）:
--    npm run cli -- operation-sighting rebuild-latest-cache

-- ⑤ 数日様子を見て問題が無ければ片付ける
-- drop table public.m6_fix_20261024;

-- 戻すとき（③の後に問題が出たら）
-- update operation_sightings os
-- set operation_id = f.wrong_operation_id, updated_at = now()
-- from public.m6_fix_20261024 f
-- where os.id = f.sighting_id;

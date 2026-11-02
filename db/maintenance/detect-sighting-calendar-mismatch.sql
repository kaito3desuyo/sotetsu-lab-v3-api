-- M6: 目撃の運用のダイヤが、その日（4 時より前は前日）に効くダイヤと違うものを見つける。
-- 「効くダイヤ」は api の CalendarQuery.findOneBySpecificDate と同じ規則で決める:
--   期間内（start_date <= d <= end_date、NULL は無制限）のダイヤのうち、
--   曜日が合い calendar_dates で type 2（除外）されていないもの、または type 1（追加）されたもの。
-- 読むだけ。target_operation_id は同じ運番の、効くダイヤの運用（効くダイヤが 1 つに決まる日だけ）。
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
    s.calendar_id as wrong_calendar_id,
    ec.n as effective_calendars,
    case when ec.n = 1 then t.id end as target_operation_id
from s
left join effective e
    on e.base_date = s.base_date and e.calendar_id = s.calendar_id
left join effective_count ec on ec.base_date = s.base_date
left join operations t
    on ec.n = 1 and t.calendar_id = ec.only_calendar_id and t.operation_number = s.operation_number
where e.calendar_id is null
order by s.sighting_time;

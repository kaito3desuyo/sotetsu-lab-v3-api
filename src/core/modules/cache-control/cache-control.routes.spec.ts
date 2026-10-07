import { Reflector } from '@nestjs/core';
import { AgencyV3Controller } from 'src/libs/agency/presentation/agency.v3.controller';
import { CalendarDateV3Controller } from 'src/libs/calendar/presentation/calendar-date.v3.controller';
import { CalendarV3Controller } from 'src/libs/calendar/presentation/calendar.v3.controller';
import { FormationV3Controller } from 'src/libs/formation/presentation/formation.v3.controller';
import { OperationSightingV3Controller } from 'src/libs/operation-sighting/presentation/operation-sighting.v3.controller';
import { OperationV3Controller } from 'src/libs/operation/presentation/operation.v3.controller';
import { RouteV3Controller } from 'src/libs/route/presentation/route.v3.controller';
import { ServiceV3Controller } from 'src/libs/service/presentation/service.v3.controller';
import { StationV3Controller } from 'src/libs/station/presentation/station.v3.controller';
import { TripBlockV3Controller } from 'src/libs/trip-block/presentation/trip-block.v3.controller';
import { TripClassV3Controller } from 'src/libs/trip-class/presentation/trip-class.v3.controller';
import { TripV3Controller } from 'src/libs/trip/presentation/trip.v3.controller';
import { CACHE_CONTROL } from './cache-control.constants';
import { CACHE_CONTROL_METADATA_KEY } from './cache-control.decorator';

// auth.guard は読み込んだ時点で Cognito の verifier を環境変数から作るので、メタデータを見るだけのここでは差し替える
jest.mock('src/core/modules/auth/auth.guard', () => ({
    AuthGuard: class {},
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyController = { prototype: any; name: string };

const { MASTER, TIMETABLE, REALTIME } = CACHE_CONTROL;

/** spec の表そのもの（docs/superpowers/specs/2026-10-07-browser-private-cache-design.md） */
const TABLE: [AnyController, string, string][] = [
    // A マスタ
    [AgencyV3Controller, 'findAll', MASTER],
    [RouteV3Controller, 'findMany', MASTER],
    [RouteV3Controller, 'findOneWithStations', MASTER],
    [ServiceV3Controller, 'findMany', MASTER],
    [ServiceV3Controller, 'findOneStations', MASTER],
    [ServiceV3Controller, 'findOneServiceWithAgencies', MASTER],
    [ServiceV3Controller, 'findOneServiceWithRoutes', MASTER],
    [StationV3Controller, 'findAll', MASTER],
    [TripClassV3Controller, 'findMany', MASTER],
    [OperationV3Controller, 'findAllGroups', MASTER],
    [CalendarV3Controller, 'findMany', MASTER],
    [CalendarV3Controller, 'findOne', MASTER],
    // B 日付つきマスタ
    [CalendarV3Controller, 'findOneBySpecificDate', MASTER],
    [CalendarDateV3Controller, 'findMany', MASTER],
    [FormationV3Controller, 'findManyBySpecificDate', MASTER],
    [FormationV3Controller, 'findManyBySpecificPeriod', MASTER],
    // C 時刻表
    [TripBlockV3Controller, 'findManyByFilter', TIMETABLE],
    [TripBlockV3Controller, 'findOneById', TIMETABLE],
    [OperationV3Controller, 'findManyByCalendarId', TIMETABLE],
    [OperationV3Controller, 'findManyWithTrips', TIMETABLE],
    [OperationV3Controller, 'findOneWithTrips', TIMETABLE],
    [OperationV3Controller, 'findManyBySpecificPeriod', TIMETABLE],
    // D リアルタイム
    [OperationSightingV3Controller, 'findManyBySpecificPeriod', REALTIME],
    [
        OperationSightingV3Controller,
        'findManyTimeCrossSectionsByOperationNumbers',
        REALTIME,
    ],
    [
        OperationSightingV3Controller,
        'findManyTimeCrossSectionsByFormationNumbers',
        REALTIME,
    ],
    [
        OperationSightingV3Controller,
        'findOneTimeCrossSectionByOperationNumber',
        REALTIME,
    ],
    [OperationV3Controller, 'findManyWithCurrentPosition', REALTIME],
    [OperationV3Controller, 'findOneWithCurrentPosition', REALTIME],
];

const reflector = new Reflector();
const read = (controller: AnyController, method: string) =>
    reflector.get<string | undefined>(
        CACHE_CONTROL_METADATA_KEY,
        controller.prototype[method],
    );

describe('v3 GET の Cache-Control', () => {
    it('表は 28 本', () => {
        expect(TABLE).toHaveLength(28);
    });

    it.each(TABLE.map(([c, m, v]) => [`${c.name}.${m}`, c, m, v] as const))(
        '%s',
        (_label, controller, method, value) => {
            expect(controller.prototype[method]).toBeInstanceOf(Function);
            expect(read(controller, method)).toBe(value);
        },
    );

    it('クライアントが使っていない 2 本には付けない', () => {
        expect(read(TripV3Controller, 'findManyByStationId')).toBeUndefined();
        expect(
            read(
                OperationSightingV3Controller,
                'findOneTimeCrossSectionByFormationNumber',
            ),
        ).toBeUndefined();
    });

    it('表に無い handler（書き込みを含む）には付けない', () => {
        const listed = new Set(TABLE.map(([c, m]) => `${c.name}.${m}`));
        const controllers = [...new Set(TABLE.map(([c]) => c))];
        const stray = controllers.flatMap((c) =>
            Object.getOwnPropertyNames(c.prototype)
                .filter((m) => m !== 'constructor')
                .filter((m) => !listed.has(`${c.name}.${m}`))
                .filter((m) => read(c, m) !== undefined)
                .map((m) => `${c.name}.${m}`),
        );
        expect(stray).toEqual([]);
    });
});

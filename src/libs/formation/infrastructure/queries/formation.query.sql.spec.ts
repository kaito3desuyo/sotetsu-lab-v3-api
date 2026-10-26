import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { ENTITIES } from '../../../../core/configs/entities.js';
import { parseSelection } from '../../../../core/utils/selection/parse-selection.js';
import {
    FORMATIONS_AS_OF_SELECTION_TREE,
    FORMATIONS_BY_PERIOD_SELECTION_TREE,
} from '../../usecase/formation-selection.js';
import { FormationModel } from '../models/formation.model.js';
import { FormationQuery } from './formation.query.js';

dayjs.extend(customParseFormat);

interface Captured {
    sql: string;
    parameters: Record<string, unknown>;
}

describe('FormationQuery - 発行する SQL', () => {
    let query: FormationQuery;
    let captured: Captured[];

    beforeAll(async () => {
        const dataSource = new DataSource({
            type: 'postgres',
            entities: ENTITIES,
        });
        // 接続せずにメタデータだけ組み立てる（getQuery は DB なしで SQL を出せる）
        await (
            dataSource as unknown as { buildMetadatas(): Promise<void> }
        ).buildMetadatas();
        const module = await Test.createTestingModule({
            providers: [
                FormationQuery,
                {
                    provide: getRepositoryToken(FormationModel),
                    useValue: dataSource.getRepository(FormationModel),
                },
            ],
        }).compile();
        query = module.get(FormationQuery);
    });

    beforeEach(() => {
        captured = [];
        const capture = (qb: SelectQueryBuilder<FormationModel>): void => {
            captured.push({
                sql: qb.getQuery(),
                parameters: qb.getParameters(),
            });
        };
        vi.spyOn(SelectQueryBuilder.prototype, 'getMany').mockImplementation(
            function (this: SelectQueryBuilder<FormationModel>) {
                capture(this);
                return Promise.resolve([]);
            },
        );
        vi.spyOn(SelectQueryBuilder.prototype, 'getOne').mockImplementation(
            function (this: SelectQueryBuilder<FormationModel>) {
                capture(this);
                return Promise.resolve(null);
            },
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('findManyBySpecificDate', async () => {
        await query.findManyBySpecificDate({ date: '2026-10-24' });
        expect(captured).toMatchInlineSnapshot(`
          [
            {
              "parameters": {
                "date": "2026-10-24",
              },
              "sql": "SELECT "formation"."id" AS "formation_id", "formation"."agencyId" AS "formation_agencyId", "formation"."vehicleType" AS "formation_vehicleType", "formation"."formationNumber" AS "formation_formationNumber", "formation"."formationDescription" AS "formation_formationDescription", "formation"."startDate" AS "formation_startDate", "formation"."endDate" AS "formation_endDate", "formation"."createdAt" AS "formation_createdAt", "formation"."updatedAt" AS "formation_updatedAt", "formation"."agency_id" AS "formation_agency_id", "vehicleFormations"."id" AS "vehicleFormations_id", "vehicleFormations"."formationId" AS "vehicleFormations_formationId", "vehicleFormations"."vehicleId" AS "vehicleFormations_vehicleId", "vehicleFormations"."carNumber" AS "vehicleFormations_carNumber", "vehicleFormations"."createdAt" AS "vehicleFormations_createdAt", "vehicleFormations"."updatedAt" AS "vehicleFormations_updatedAt", "vehicleFormations"."formation_id" AS "vehicleFormations_formation_id", "vehicleFormations"."vehicle_id" AS "vehicleFormations_vehicle_id", "vehicle"."id" AS "vehicle_id", "vehicle"."vehicleNumber" AS "vehicle_vehicleNumber", "vehicle"."belongs" AS "vehicle_belongs", "vehicle"."productionDate" AS "vehicle_productionDate", "vehicle"."scrappedDate" AS "vehicle_scrappedDate", "vehicle"."createdAt" AS "vehicle_createdAt", "vehicle"."updatedAt" AS "vehicle_updatedAt" FROM "formations" "formation" LEFT JOIN "vehicle_formations" "vehicleFormations" ON "vehicleFormations"."formation_id"="formation"."id" LEFT JOIN "vehicles" "vehicle" ON "vehicle"."id"="vehicleFormations"."vehicle_id" WHERE (formation.start_date <= :date OR formation.start_date IS NULL) AND (formation.end_date >= :date OR formation.end_date IS NULL) ORDER BY to_number(formation.vehicle_type, '9999999999999999') ASC, to_number(formation.formation_number, '9999999999999999') ASC",
            },
          ]
        `);
    });

    it('findManyBySpecificPeriod', async () => {
        await query.findManyBySpecificPeriod({
            startDate: '2026-10-01',
            endDate: '2026-10-31',
        });
        expect(captured).toMatchInlineSnapshot(`
          [
            {
              "parameters": {
                "endDate": "2026-10-31",
                "startDate": "2026-10-01",
              },
              "sql": "SELECT "formation"."id" AS "formation_id", "formation"."agencyId" AS "formation_agencyId", "formation"."vehicleType" AS "formation_vehicleType", "formation"."formationNumber" AS "formation_formationNumber", "formation"."formationDescription" AS "formation_formationDescription", "formation"."startDate" AS "formation_startDate", "formation"."endDate" AS "formation_endDate", "formation"."createdAt" AS "formation_createdAt", "formation"."updatedAt" AS "formation_updatedAt", "formation"."agency_id" AS "formation_agency_id", "agency"."id" AS "agency_id", "agency"."agencyNumber" AS "agency_agencyNumber", "agency"."parentAgencyNumber" AS "agency_parentAgencyNumber", "agency"."agencyOfficialName" AS "agency_agencyOfficialName", "agency"."agencyName" AS "agency_agencyName", "agency"."agencyType" AS "agency_agencyType", "agency"."agencyUrl" AS "agency_agencyUrl", "agency"."agencyPhone" AS "agency_agencyPhone", "agency"."agencyFareUrl" AS "agency_agencyFareUrl", "agency"."createdAt" AS "agency_createdAt", "agency"."updatedAt" AS "agency_updatedAt" FROM "formations" "formation" LEFT JOIN "agencies" "agency" ON "agency"."id"="formation"."agency_id" WHERE (formation.start_date <= :endDate OR formation.start_date IS NULL) AND (formation.end_date >= :startDate OR formation.end_date IS NULL) ORDER BY to_number(formation.vehicle_type, '9999999999999999') ASC, to_number(formation.formation_number, '9999999999999999') ASC",
            },
          ]
        `);
    });

    it('findManyBySpecificDateWithSelection', async () => {
        await query.findManyBySpecificDateWithSelection(
            { date: '2026-10-24' },
            parseSelection(
                {
                    include: 'vehicleFormations.vehicle',
                    fields: { formation: 'formationNumber' },
                },
                FORMATIONS_AS_OF_SELECTION_TREE,
            )!,
        );
        expect(captured).toMatchInlineSnapshot(`
          [
            {
              "parameters": {
                "date": "2026-10-24",
              },
              "sql": "SELECT "formation"."id" AS "formation_id", "formation"."formationNumber" AS "formation_formationNumber", "vehicleFormations"."id" AS "vehicleFormations_id", "vehicleFormations"."formationId" AS "vehicleFormations_formationId", "vehicleFormations"."vehicleId" AS "vehicleFormations_vehicleId", "vehicleFormations"."carNumber" AS "vehicleFormations_carNumber", "vehicleFormations"."createdAt" AS "vehicleFormations_createdAt", "vehicleFormations"."updatedAt" AS "vehicleFormations_updatedAt", "vehicle"."id" AS "vehicle_id", "vehicle"."vehicleNumber" AS "vehicle_vehicleNumber", "vehicle"."belongs" AS "vehicle_belongs", "vehicle"."productionDate" AS "vehicle_productionDate", "vehicle"."scrappedDate" AS "vehicle_scrappedDate", "vehicle"."createdAt" AS "vehicle_createdAt", "vehicle"."updatedAt" AS "vehicle_updatedAt" FROM "formations" "formation" LEFT JOIN "vehicle_formations" "vehicleFormations" ON "vehicleFormations"."formation_id"="formation"."id" LEFT JOIN "vehicles" "vehicle" ON "vehicle"."id"="vehicleFormations"."vehicle_id" WHERE (formation.start_date <= :date OR formation.start_date IS NULL) AND (formation.end_date >= :date OR formation.end_date IS NULL) ORDER BY to_number(formation.vehicle_type, '9999999999999999') ASC, to_number(formation.formation_number, '9999999999999999') ASC",
            },
          ]
        `);
    });

    it('findManyBySpecificPeriodWithSelection', async () => {
        await query.findManyBySpecificPeriodWithSelection(
            { startDate: '2026-10-01', endDate: '2026-10-31' },
            parseSelection(
                { include: 'agency', fields: { formation: 'formationNumber' } },
                FORMATIONS_BY_PERIOD_SELECTION_TREE,
            )!,
        );
        expect(captured).toMatchInlineSnapshot(`
          [
            {
              "parameters": {
                "endDate": "2026-10-31",
                "startDate": "2026-10-01",
              },
              "sql": "SELECT "formation"."id" AS "formation_id", "formation"."formationNumber" AS "formation_formationNumber", "agency"."id" AS "agency_id", "agency"."agencyNumber" AS "agency_agencyNumber", "agency"."parentAgencyNumber" AS "agency_parentAgencyNumber", "agency"."agencyOfficialName" AS "agency_agencyOfficialName", "agency"."agencyName" AS "agency_agencyName", "agency"."agencyType" AS "agency_agencyType", "agency"."agencyUrl" AS "agency_agencyUrl", "agency"."agencyPhone" AS "agency_agencyPhone", "agency"."agencyFareUrl" AS "agency_agencyFareUrl", "agency"."createdAt" AS "agency_createdAt", "agency"."updatedAt" AS "agency_updatedAt" FROM "formations" "formation" LEFT JOIN "agencies" "agency" ON "agency"."id"="formation"."agency_id" WHERE (formation.start_date <= :endDate OR formation.start_date IS NULL) AND (formation.end_date >= :startDate OR formation.end_date IS NULL) ORDER BY to_number(formation.vehicle_type, '9999999999999999') ASC, to_number(formation.formation_number, '9999999999999999') ASC",
            },
          ]
        `);
    });

    it('findOneByAgencyIdAndFormationNumberAndDate', async () => {
        await query.findOneByAgencyIdAndFormationNumberAndDate({
            agencyId: 'agency-1',
            formationNumber: '10701',
            date: '2026-10-24',
        });
        expect(captured).toMatchInlineSnapshot(`
          [
            {
              "parameters": {
                "agencyId": "agency-1",
                "date": "2026-10-24",
                "formationNumber": "10701",
              },
              "sql": "SELECT "formation"."id" AS "formation_id", "formation"."agencyId" AS "formation_agencyId", "formation"."vehicleType" AS "formation_vehicleType", "formation"."formationNumber" AS "formation_formationNumber", "formation"."formationDescription" AS "formation_formationDescription", "formation"."startDate" AS "formation_startDate", "formation"."endDate" AS "formation_endDate", "formation"."createdAt" AS "formation_createdAt", "formation"."updatedAt" AS "formation_updatedAt", "formation"."agency_id" AS "formation_agency_id" FROM "formations" "formation" WHERE "formation"."agency_id" = :agencyId AND formation.formation_number = :formationNumber AND (formation.start_date <= :date OR formation.start_date IS NULL) AND (formation.end_date >= :date OR formation.end_date IS NULL)",
            },
          ]
        `);
    });

    it('findOneByAgencyIdAndVehicleNumberAndDate', async () => {
        await query.findOneByAgencyIdAndVehicleNumberAndDate({
            agencyId: 'agency-1',
            vehicleNumber: '10701',
            date: '2026-10-24',
        });
        expect(captured).toMatchInlineSnapshot(`
          [
            {
              "parameters": {
                "agencyId": "agency-1",
                "date": "2026-10-24",
                "vehicleNumber": "10701",
              },
              "sql": "SELECT "formation"."id" AS "formation_id", "formation"."agencyId" AS "formation_agencyId", "formation"."vehicleType" AS "formation_vehicleType", "formation"."formationNumber" AS "formation_formationNumber", "formation"."formationDescription" AS "formation_formationDescription", "formation"."startDate" AS "formation_startDate", "formation"."endDate" AS "formation_endDate", "formation"."createdAt" AS "formation_createdAt", "formation"."updatedAt" AS "formation_updatedAt", "formation"."agency_id" AS "formation_agency_id" FROM "formations" "formation" LEFT JOIN "vehicle_formations" "vehicleFormation" ON "vehicleFormation"."formation_id"="formation"."id" LEFT JOIN "vehicles" "vehicle" ON "vehicle"."id"="vehicleFormation"."vehicle_id" WHERE "formation"."agency_id" = :agencyId AND vehicle.vehicle_number = :vehicleNumber AND (formation.start_date <= :date OR formation.start_date IS NULL) AND (formation.end_date >= :date OR formation.end_date IS NULL)",
            },
          ]
        `);
    });
});

import { AgencyModel } from '../../libs/agency/infrastructure/models/agency.model.js';
import { AuthUserModel } from '../../libs/user/infrastructure/models/auth-user.model.js';
import { CalendarDateModel } from '../../libs/calendar/infrastructure/models/calendar-date.model.js';
import { CalendarModel } from '../../libs/calendar/infrastructure/models/calendar.model.js';
import { FeatureFlagModel } from '../modules/feature-flag/feature-flag.model.js';
import { FormationModel } from '../../libs/formation/infrastructure/models/formation.model.js';
import { OperatingSystemModel } from '../../libs/service/infrastructure/models/operating-system.model.js';
import { OperationModel } from '../../libs/operation/infrastructure/models/operation.model.js';
import { OperationSightingAuthorModel } from '../../libs/operation-sighting/infrastructure/models/operation-sighting-author.model.js';
import { OperationSightingInvalidationModel } from '../../libs/operation-sighting/infrastructure/models/operation-sighting-invalidation.model.js';
import { OperationSightingLatestCacheModel } from '../../libs/operation-sighting/infrastructure/models/operation-sighting-latest-cache.model.js';
import { OperationSightingManagementLogModel } from '../../libs/operation-sighting/infrastructure/models/operation-sighting-management-log.model.js';
import { OperationSightingModel } from '../../libs/operation-sighting/infrastructure/models/operation-sighting.model.js';
import { ProfileModel } from '../../libs/user/infrastructure/models/profile.model.js';
import { RouteModel } from '../../libs/route/infrastructure/models/route.model.js';
import { RouteStationListModel } from '../../libs/route/infrastructure/models/route-station-list.model.js';
import { ServiceModel } from '../../libs/service/infrastructure/models/service.model.js';
import { StationModel } from '../../libs/station/infrastructure/models/station.model.js';
import { StopModel } from '../../libs/station/infrastructure/models/stop.model.js';
import { TimeModel } from '../../libs/trip/infrastructure/models/time.model.js';
import { TripBlockModel } from '../../libs/trip-block/infrastructure/models/trip-block.model.js';
import { TripClassModel } from '../../libs/trip-class/infrastructure/models/trip-class.model.js';
import { TripModel } from '../../libs/trip/infrastructure/models/trip.model.js';
import { TripOperationListModel } from '../../libs/trip/infrastructure/models/trip-operation-list.model.js';
import { VehicleFormationModel } from '../../libs/formation/infrastructure/models/vehicle-formation.model.js';
import { VehicleModel } from '../../libs/vehicle/infrastructure/models/vehicle.model.js';

/**
 * TypeORM に渡すエンティティ。glob（*.model.{ts,js}）で探すと TypeORM が素の Node で import するため、
 * テスト（vitest）ではアプリと別のクラスが 2 重にでき、ESM では .ts を読めない。クラスで渡す。
 * モデルを足したらここにも足す（entities.spec.ts が漏れを見つける）。
 */
export const ENTITIES = [
    AgencyModel,
    AuthUserModel,
    CalendarDateModel,
    CalendarModel,
    FeatureFlagModel,
    FormationModel,
    OperatingSystemModel,
    OperationModel,
    OperationSightingAuthorModel,
    OperationSightingInvalidationModel,
    OperationSightingLatestCacheModel,
    OperationSightingManagementLogModel,
    OperationSightingModel,
    ProfileModel,
    RouteModel,
    RouteStationListModel,
    ServiceModel,
    StationModel,
    StopModel,
    TimeModel,
    TripBlockModel,
    TripClassModel,
    TripModel,
    TripOperationListModel,
    VehicleFormationModel,
    VehicleModel,
];

import { CreateTimeDto } from '../time/time.dto';
import { CreateTripOperationListDto } from '../trip-operation-list/trip_operation_list.dto';

/* tslint:disable: variable-name */
export class CreateTripDto {
  service_id: string;
  trip_number: string;
  trip_class_id: string;
  trip_name: string;
  trip_direction: number;
  depot_in: boolean;
  depot_out: boolean;
  calendar_id: string;
  extra_calendar_id: string;
  times?: CreateTimeDto[];
  trip_operation_lists?: CreateTripOperationListDto[];
}

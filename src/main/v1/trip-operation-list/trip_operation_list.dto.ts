/* tslint:disable: variable-name */
export class CreateTripOperationListDto {
  trip_id: string;
  operation_id: string;
  start_station_id?: string;
  end_station_id?: string;
  start_time_id: string;
  end_time_id: string;
}

// tslint:disable-next-line: max-classes-per-file
export class UpdateTripOperationListDto {
  trip_id: string;
  operation_id: string;
  start_station_id?: string;
  end_station_id?: string;
  start_time_id: string;
  end_time_id: string;
}

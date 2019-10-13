/* tslint:disable: variable-name */
export class CreateTimeDto {
  trip_id?: string;
  station_id: string;
  stop_id: string;
  stop_sequence: number;
  pickup_type: number;
  dropoff_type: number;
  arrival_days: number;
  arrival_time: string;
  departure_days: number;
  departure_time: string;
}

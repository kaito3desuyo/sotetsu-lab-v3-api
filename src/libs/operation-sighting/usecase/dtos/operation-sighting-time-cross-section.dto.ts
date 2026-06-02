import { Expose, Type } from 'class-transformer';
import { OperationSightingDetailsDto } from './operation-sighting-details.dto';

export class OperationSightingTimeCrossSectionDto {
    @Expose()
    @Type(() => OperationSightingDetailsDto)
    latestSighting: OperationSightingDetailsDto | null;

    @Expose()
    @Type(() => OperationSightingDetailsDto)
    expectedSighting:
        | (Omit<
              Partial<OperationSightingDetailsDto>,
              'operation' | 'formation'
          > & {
              formation?:
                  | Partial<OperationSightingDetailsDto['formation']>
                  | null;
              operation?:
                  | Partial<OperationSightingDetailsDto['operation']>
                  | null;
          })
        | null;
}

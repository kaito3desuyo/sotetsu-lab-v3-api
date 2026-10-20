import { Nested } from 'src/core/types/nested';
import { Expose, Type } from 'class-transformer';
import { OperationSightingDetailsDto } from './operation-sighting-details.dto';

export class OperationSightingTimeCrossSectionDto {
    @Expose()
    @Type(() => OperationSightingDetailsDto)
    latestSighting: Nested<OperationSightingDetailsDto | null>;

    @Expose()
    @Type(() => OperationSightingDetailsDto)
    expectedSighting:
        | (Omit<
              Partial<OperationSightingDetailsDto>,
              'operation' | 'formation'
          > & {
              formation?: Partial<
                  OperationSightingDetailsDto['formation']
              > | null;
              operation?: Partial<
                  OperationSightingDetailsDto['operation']
              > | null;
          })
        | null;

    /** 引き継いだ目撃のとき、目撃されたときの運用（例: 12K の断面で 11K として目撃）。直接の目撃は null */
    @Expose()
    sightedAsOperation?: {
        operationId: string;
        operationNumber: string;
    } | null;
}

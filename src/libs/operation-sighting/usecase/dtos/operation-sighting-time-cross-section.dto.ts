import { Expose, Type } from 'class-transformer';
import { OperationSightingDetailsDto } from './operation-sighting-details.dto';

export class OperationSightingTimeCrossSectionDto {
    @Expose()
    @Type(() => OperationSightingDetailsDto)
    latestSighting: OperationSightingDetailsDto;

    @Expose()
    @Type(() => OperationSightingDetailsDto)
    expectedSighting: Omit<
        Partial<OperationSightingDetailsDto>,
        'operation' | 'formation'
    > & {
        formation?: Partial<OperationSightingDetailsDto['formation']>;
        operation?: Partial<OperationSightingDetailsDto['operation']>;
    };
}

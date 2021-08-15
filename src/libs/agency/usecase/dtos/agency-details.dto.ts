import { Expose, Type } from 'class-transformer';
import { RouteDetailsDto } from 'src/libs/route/usecase/dtos/route-details.dto';
import { BaseAgencyDto } from './base-agency.dto';

export class AgencyDetailsDto extends BaseAgencyDto {
    @Expose()
    id: string;

    @Expose()
    agencyNumber: string;

    @Expose()
    parentAgencyNumber: string;

    @Expose()
    agencyOfficialName: string;

    @Expose()
    agencyName: string;

    @Expose()
    agencyType: number;

    @Expose()
    agencyUrl: string;

    @Expose()
    agencyPhone: string;

    @Expose()
    agencyFareUrl: string;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => RouteDetailsDto)
    routes: RouteDetailsDto[];
}

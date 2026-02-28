import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { TripClassDetailsDto } from '../usecase/dtos/trip-class-details.dto';
import { TripClassV3Service } from '../usecase/trip-class.v3.service';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class TripClassV3Controller {
    constructor(private readonly tripClassV3Service: TripClassV3Service) {}

    @Get()
    async findMany(): Promise<TripClassDetailsDto[]> {
        const result = await this.tripClassV3Service.findMany();
        return result;
    }
}

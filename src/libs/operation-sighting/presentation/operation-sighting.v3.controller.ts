import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBAC } from 'src/core/modules/rbac/rbac.decorator';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { Role } from 'src/core/modules/rbac/role.enum';
import { InvalidateOperationSightingDto } from '../usecase/dtos/invalidate-operation-sighting.dto';
import { OperationSightingDetailsDto } from '../usecase/dtos/operation-sighting-details.dto';
import { RestoreOperationSightingDto } from '../usecase/dtos/restore-operation-sighting.dto';
import { OperationSightingV3Service } from '../usecase/operation-sighting.v3.service';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class OperationSightingV3Controller {
    constructor(
        private readonly operationSightingV3Service: OperationSightingV3Service,
    ) {}

    @Patch('/:id/invalidate')
    @RBAC(Role.EDITOR, Role.MANAGER)
    async invalidate(
        @Param('id') id: string,
        @Body() body: InvalidateOperationSightingDto,
    ): Promise<OperationSightingDetailsDto> {
        const { userId, reason } = body;

        const result = await this.operationSightingV3Service.invalidate({
            operationSightingId: id,
            userId,
            reason,
        });

        return result;
    }

    @Patch('/:id/restore')
    @RBAC(Role.EDITOR, Role.MANAGER)
    async restore(
        @Param('id') id: string,
        @Body() body: RestoreOperationSightingDto,
    ): Promise<OperationSightingDetailsDto> {
        const { userId, reason } = body;

        const result = await this.operationSightingV3Service.restore({
            operationSightingId: id,
            userId,
            reason,
        });

        return result;
    }
}

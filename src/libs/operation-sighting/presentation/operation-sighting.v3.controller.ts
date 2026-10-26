import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CACHE_CONTROL } from '../../../core/modules/cache-control/cache-control.constants.js';
import { CacheControl } from '../../../core/modules/cache-control/cache-control.decorator.js';
import { RBAC } from '../../../core/modules/rbac/rbac.decorator.js';
import { RBACWhenFlag } from '../../../core/modules/rbac/rbac-when-flag.decorator.js';
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { Role } from '../../../core/modules/rbac/role.enum.js';
import { InvalidateOperationSightingDto } from '../usecase/dtos/invalidate-operation-sighting.dto.js';
import { OperationSightingDetailsDto } from '../usecase/dtos/operation-sighting-details.dto.js';
import { parseCommaList } from '../../../core/utils/comma-list.js';
import { OperationSightingTimeCrossSectionDto } from '../usecase/dtos/operation-sighting-time-cross-section.dto.js';
import { PostOperationSightingDto } from '../usecase/dtos/post-operation-sighting.dto.js';
import { RestoreOperationSightingDto } from '../usecase/dtos/restore-operation-sighting.dto.js';
import { OperationSightingV3Service } from '../usecase/operation-sighting.v3.service.js';
import { OperationSightingIdParam } from '../usecase/params/operation-sighting-id.param.js';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class OperationSightingV3Controller {
    constructor(
        private readonly operationSightingV3Service: OperationSightingV3Service,
    ) {}

    /** `include`・`fields` で返す関連・列を選べる（docs/adr/0010-v3-include-and-fields.md） */
    @Get('/from/:start/to/:end')
    @CacheControl(CACHE_CONTROL.REALTIME)
    async findManyBySpecificPeriod(
        @Param('start') start: string,
        @Param('end') end: string,
        @Query('includeInvalidated') includeInvalidated?: boolean,
        @Query('includeCarriedOver') includeCarriedOver?: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<OperationSightingDetailsDto[] | Record<string, unknown>[]> {
        const result =
            await this.operationSightingV3Service.findManyBySpecificPeriod({
                start,
                end,
                includeInvalidated,
                includeCarriedOver: includeCarriedOver === 'true',
                include,
                fields,
            });

        return result;
    }

    /** 複数の運用番号の時刻断面をまとめて返す。`operationNumbers=11,12,…`。キーは運用番号。`fields` で返す項目を選べる（include は受けない。docs/adr/0010-v3-include-and-fields.md） */
    @Get('/time-cross-section/operation-numbers')
    @CacheControl(CACHE_CONTROL.REALTIME)
    async findManyTimeCrossSectionsByOperationNumbers(
        @Query('operationNumbers') operationNumbers: string,
        @Query('searchTime') searchTime?: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<
        Record<
            string,
            OperationSightingTimeCrossSectionDto | Record<string, unknown>
        >
    > {
        const result =
            await this.operationSightingV3Service.findManyTimeCrossSectionsByOperationNumbers(
                {
                    operationNumbers: parseCommaList(operationNumbers),
                    searchTime,
                    include,
                    fields,
                },
            );

        return result;
    }

    /** 複数の編成番号の時刻断面をまとめて返す。`formationNumbers=10701,…`。キーは編成番号。`fields` で返す項目を選べる（include は受けない。docs/adr/0010-v3-include-and-fields.md） */
    @Get('/time-cross-section/formation-numbers')
    @CacheControl(CACHE_CONTROL.REALTIME)
    async findManyTimeCrossSectionsByFormationNumbers(
        @Query('formationNumbers') formationNumbers: string,
        @Query('searchTime') searchTime?: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<
        Record<
            string,
            OperationSightingTimeCrossSectionDto | Record<string, unknown>
        >
    > {
        const result =
            await this.operationSightingV3Service.findManyTimeCrossSectionsByFormationNumbers(
                {
                    formationNumbers: parseCommaList(formationNumbers),
                    searchTime,
                    include,
                    fields,
                },
            );

        return result;
    }

    /** 運用番号の時刻断面を返す。`fields` で返す項目を選べる（include は受けない。docs/adr/0010-v3-include-and-fields.md） */
    @Get('/time-cross-section/operation-number/:operationNumber')
    @CacheControl(CACHE_CONTROL.REALTIME)
    async findOneTimeCrossSectionByOperationNumber(
        @Param('operationNumber') operationNumber: string,
        @Query('searchTime') searchTime?: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<OperationSightingTimeCrossSectionDto | Record<string, unknown>> {
        const result =
            await this.operationSightingV3Service.findOneTimeCrossSectionByOperationNumber(
                {
                    operationNumber,
                    searchTime,
                    include,
                    fields,
                },
            );

        return result;
    }

    /** 編成番号の時刻断面を返す。`fields` で返す項目を選べる（include は受けない。docs/adr/0010-v3-include-and-fields.md） */
    @Get('/time-cross-section/formation-number/:formationNumber')
    async findOneTimeCrossSectionByFormationNumber(
        @Param('formationNumber') formationNumber: string,
        @Query('searchTime') searchTime?: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<OperationSightingTimeCrossSectionDto | Record<string, unknown>> {
        const result =
            await this.operationSightingV3Service.findOneTimeCrossSectionByFormationNumber(
                {
                    formationNumber,
                    searchTime,
                    include,
                    fields,
                },
            );

        return result;
    }

    @Post()
    @RBAC(Role.REPORTER, Role.EDITOR, Role.MANAGER)
    @RBACWhenFlag('registered_only_posting')
    async post(
        @Req() req: Request,
        @Body() body: PostOperationSightingDto,
    ): Promise<OperationSightingDetailsDto> {
        // 投稿者を記録するのは役割のある利用者だけ（フラグ off で通った匿名の利用者は null）
        const userId = req.auth?.role ? req.auth.userId : null;

        const result = await this.operationSightingV3Service.post({
            ...body,
            userId,
        });

        return result;
    }

    @Patch('/:id/invalidate')
    @RBAC(Role.EDITOR, Role.MANAGER)
    async invalidate(
        @Req() req: Request,
        @Param() param: OperationSightingIdParam,
        @Body() body: InvalidateOperationSightingDto,
    ): Promise<OperationSightingDetailsDto> {
        const result = await this.operationSightingV3Service.invalidate({
            operationSightingId: param.id,
            userId: req.auth!.userId!,
            reason: body.reason,
        });

        return result;
    }

    @Patch('/:id/restore')
    @RBAC(Role.EDITOR, Role.MANAGER)
    async restore(
        @Req() req: Request,
        @Param() param: OperationSightingIdParam,
        @Body() body: RestoreOperationSightingDto,
    ): Promise<OperationSightingDetailsDto> {
        const result = await this.operationSightingV3Service.restore({
            operationSightingId: param.id,
            userId: req.auth!.userId!,
            reason: body.reason,
        });

        return result;
    }
}

import {
    Body,
    Controller,
    Get,
    HttpCode,
    Param,
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
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { Role } from '../../../core/modules/rbac/role.enum.js';
import { OperationSightingSummaryDto } from '../../operation-sighting/usecase/dtos/operation-sighting-summary.dto.js';
import { OperationSightingV3Service } from '../../operation-sighting/usecase/operation-sighting.v3.service.js';
import { OperationSightingListParam } from '../../operation-sighting/usecase/params/operation-sighting-list.param.js';
import { MyOperationSightingDto } from '../../operation-sighting/usecase/dtos/my-operation-sighting.dto.js';
import { BanUserDto } from '../usecase/dtos/ban-user.dto.js';
import { MySummaryDto } from '../usecase/dtos/my-summary.dto.js';
import { UnbanUserDto } from '../usecase/dtos/unban-user.dto.js';
import { UserAccessTraceDto } from '../usecase/dtos/user-access-trace.dto.js';
import { UserSummaryDto } from '../usecase/dtos/user-summary.dto.js';
import { UserIdParam } from '../usecase/params/user-id.param.js';
import { UserV3Service } from '../usecase/user.v3.service.js';

/**
 * 利用者。個人情報を含むので、本人の /me は REPORTER 以上・他人の読み取りは EDITOR・MANAGER、
 * BAN・解除・手がかりは MANAGER だけ・応答は保存させない。
 * /me は `@Get('/:userId')` より前に宣言する（me が userId に食われないように）
 */
@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class UserV3Controller {
    constructor(
        private readonly userV3Service: UserV3Service,
        private readonly operationSightingV3Service: OperationSightingV3Service,
    ) {}

    /** 本人の要約。本人の id は認証から取り、URL・query では受けない */
    @Get('/me')
    @RBAC(Role.REPORTER, Role.EDITOR, Role.MANAGER)
    @CacheControl(CACHE_CONTROL.REALTIME)
    async findMySummary(@Req() req: Request): Promise<MySummaryDto> {
        const userId = req.auth!.userId!;
        const [summary, corroboration] = await Promise.all([
            this.userV3Service.findUserSummary({ userId }),
            this.operationSightingV3Service.countCorroborationsByUserId({
                userId,
            }),
        ]);

        return {
            sightingCount: summary.sightingCount,
            invalidatedCount: summary.invalidatedCount,
            firstSightingAt: summary.firstSightingAt,
            lastSightingAt: summary.lastSightingAt,
            corroboration,
        };
    }

    @Get('/me/operation-sightings')
    @RBAC(Role.REPORTER, Role.EDITOR, Role.MANAGER)
    @CacheControl(CACHE_CONTROL.REALTIME)
    async findMyOperationSightings(
        @Req() req: Request,
        @Query() query: OperationSightingListParam,
    ): Promise<MyOperationSightingDto[]> {
        return this.operationSightingV3Service.findManyMine({
            userId: req.auth!.userId!,
            limit: query.limit,
            before: query.before,
        });
    }

    @Get('/:userId')
    @RBAC(Role.EDITOR, Role.MANAGER)
    @CacheControl(CACHE_CONTROL.REALTIME)
    async findUserSummary(
        @Param() param: UserIdParam,
    ): Promise<UserSummaryDto> {
        return this.userV3Service.findUserSummary({ userId: param.userId });
    }

    @Get('/:userId/operation-sightings')
    @RBAC(Role.EDITOR, Role.MANAGER)
    @CacheControl(CACHE_CONTROL.REALTIME)
    async findOperationSightings(
        @Param() param: UserIdParam,
        @Query() query: OperationSightingListParam,
    ): Promise<OperationSightingSummaryDto[]> {
        return this.operationSightingV3Service.findManyByUserId({
            userId: param.userId,
            limit: query.limit,
            before: query.before,
        });
    }

    @Post('/:userId/ban')
    @HttpCode(200)
    @RBAC(Role.MANAGER)
    @CacheControl(CACHE_CONTROL.REALTIME)
    async banUser(
        @Req() req: Request,
        @Param() param: UserIdParam,
        @Body() body: BanUserDto,
    ): Promise<UserSummaryDto> {
        return this.userV3Service.banUser({
            userId: param.userId,
            changedBy: req.auth!.userId!,
            reason: body.reason,
        });
    }

    @Post('/:userId/unban')
    @HttpCode(200)
    @RBAC(Role.MANAGER)
    @CacheControl(CACHE_CONTROL.REALTIME)
    async unbanUser(
        @Req() req: Request,
        @Param() param: UserIdParam,
        @Body() body: UnbanUserDto,
    ): Promise<UserSummaryDto> {
        return this.userV3Service.unbanUser({
            userId: param.userId,
            changedBy: req.auth!.userId!,
            reason: body.reason,
        });
    }

    @Get('/:userId/traces')
    @RBAC(Role.MANAGER)
    @CacheControl(CACHE_CONTROL.REALTIME)
    async findTraces(
        @Param() param: UserIdParam,
    ): Promise<UserAccessTraceDto[]> {
        return this.userV3Service.findTraces({ userId: param.userId });
    }
}

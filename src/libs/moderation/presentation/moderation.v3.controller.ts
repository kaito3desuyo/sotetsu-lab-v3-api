import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CACHE_CONTROL } from '../../../core/modules/cache-control/cache-control.constants.js';
import { CacheControl } from '../../../core/modules/cache-control/cache-control.decorator.js';
import { RBAC } from '../../../core/modules/rbac/rbac.decorator.js';
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { Role } from '../../../core/modules/rbac/role.enum.js';
import { ModerationRecentSightingDto } from '../usecase/dtos/moderation-recent-sighting.dto.js';
import { ModerationSightingAuthorDto } from '../usecase/dtos/moderation-sighting-author.dto.js';
import { ModerationSightingDto } from '../usecase/dtos/moderation-sighting.dto.js';
import { ModerationUserSummaryDto } from '../usecase/dtos/moderation-user-summary.dto.js';
import { ModerationV3Service } from '../usecase/moderation.v3.service.js';
import { ModerationSightingIdParam } from '../usecase/params/moderation-sighting-id.param.js';
import { ModerationSightingListParam } from '../usecase/params/moderation-sighting-list.param.js';
import { ModerationUserIdParam } from '../usecase/params/moderation-user-id.param.js';

/** 投稿の見回り。個人情報を含むので、どの口も EDITOR・MANAGER だけ・応答は保存させない */
@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class ModerationV3Controller {
    constructor(private readonly moderationV3Service: ModerationV3Service) {}

    @Get('/users/:userId')
    @RBAC(Role.EDITOR, Role.MANAGER)
    @CacheControl(CACHE_CONTROL.REALTIME)
    async findUserSummary(
        @Param() param: ModerationUserIdParam,
    ): Promise<ModerationUserSummaryDto> {
        return this.moderationV3Service.findUserSummary({
            userId: param.userId,
        });
    }

    @Get('/users/:userId/sightings')
    @RBAC(Role.EDITOR, Role.MANAGER)
    @CacheControl(CACHE_CONTROL.REALTIME)
    async findSightingsByUser(
        @Param() param: ModerationUserIdParam,
        @Query() query: ModerationSightingListParam,
    ): Promise<ModerationSightingDto[]> {
        return this.moderationV3Service.findSightingsByUser({
            userId: param.userId,
            limit: query.limit,
            before: query.before,
        });
    }

    @Get('/sightings/:id/author')
    @RBAC(Role.EDITOR, Role.MANAGER)
    @CacheControl(CACHE_CONTROL.REALTIME)
    async findSightingAuthor(
        @Param() param: ModerationSightingIdParam,
    ): Promise<ModerationSightingAuthorDto> {
        return this.moderationV3Service.findSightingAuthor({
            operationSightingId: param.id,
        });
    }

    @Get('/recent-sightings')
    @RBAC(Role.EDITOR, Role.MANAGER)
    @CacheControl(CACHE_CONTROL.REALTIME)
    async findRecentSightings(
        @Query() query: ModerationSightingListParam,
    ): Promise<ModerationRecentSightingDto[]> {
        return this.moderationV3Service.findRecentSightings({
            limit: query.limit,
            before: query.before,
        });
    }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CacheControl } from '../cache-control/cache-control.decorator.js';
import { FeatureFlags } from './feature-flags.js';

/** 全フラグを返す。トークンは求めるが役割は問わない（ゲストの画面も出し分けに使う） */
@Controller()
@UseGuards(AuthGuard)
export class FeatureFlagController {
    constructor(private readonly featureFlags: FeatureFlags) {}

    @Get()
    @CacheControl('no-store')
    async all(): Promise<Record<string, boolean>> {
        return this.featureFlags.all();
    }
}

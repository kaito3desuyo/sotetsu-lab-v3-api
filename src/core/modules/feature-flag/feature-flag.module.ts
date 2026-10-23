import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureFlagModel } from './feature-flag.model.js';
import { FeatureFlags } from './feature-flags.js';

/** RBACGuard が各 controller の module で作られるため、どこからでも FeatureFlags を引けるよう Global にする */
@Global()
@Module({
    imports: [TypeOrmModule.forFeature([FeatureFlagModel])],
    providers: [FeatureFlags],
    exports: [FeatureFlags],
})
export class FeatureFlagModule {}

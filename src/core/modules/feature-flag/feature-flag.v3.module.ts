import { Module } from '@nestjs/common';
import { FeatureFlagController } from './feature-flag.controller.js';

@Module({
    controllers: [FeatureFlagController],
})
export class FeatureFlagV3Module {}

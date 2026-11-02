import { Module } from '@nestjs/common';
import { ModerationLibsModule } from './moderation.libs.module.js';
import { ModerationV3Controller } from './presentation/moderation.v3.controller.js';
import { ModerationV3Service } from './usecase/moderation.v3.service.js';

@Module({
    imports: [ModerationLibsModule],
    controllers: [ModerationV3Controller],
    providers: [ModerationV3Service],
})
export class ModerationV3Module {}

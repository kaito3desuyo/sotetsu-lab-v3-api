import { Module } from '@nestjs/common';
import {
    InvalidateSharedCacheCommand,
    SharedCacheCliCommand,
} from './shared-cache.cli.command.js';
import { SharedCacheModule } from './shared-cache.module.js';

@Module({
    imports: [SharedCacheModule],
    providers: [SharedCacheCliCommand, InvalidateSharedCacheCommand],
})
export class SharedCacheCliModule {}

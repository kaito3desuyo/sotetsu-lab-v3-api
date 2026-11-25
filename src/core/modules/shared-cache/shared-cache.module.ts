import { Module } from '@nestjs/common';
import { SharedCache } from './shared-cache.js';

@Module({
    providers: [SharedCache],
    exports: [SharedCache],
})
export class SharedCacheModule {}

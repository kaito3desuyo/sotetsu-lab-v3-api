import { Module } from '@nestjs/common';
import { CdnInvalidation } from './cdn-invalidation.js';

@Module({
    providers: [CdnInvalidation],
    exports: [CdnInvalidation],
})
export class CdnInvalidationModule {}

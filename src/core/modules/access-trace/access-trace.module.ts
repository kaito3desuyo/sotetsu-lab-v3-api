import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessTraces } from './access-traces.js';
import { UserAccessTraceModel } from './user-access-trace.model.js';

/** 認証と投稿のどちらからでも AccessTraces を引けるよう Global にする */
@Global()
@Module({
    imports: [TypeOrmModule.forFeature([UserAccessTraceModel])],
    providers: [AccessTraces],
    exports: [AccessTraces],
})
export class AccessTraceModule {}

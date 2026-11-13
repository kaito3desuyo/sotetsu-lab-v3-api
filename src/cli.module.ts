import { Module } from '@nestjs/common';
import { DatabaseModule } from './core/modules/database/database.module.js';
import { UserLibsModule } from './libs/user/user.libs.module.js';
import { CliRoutingModule } from './routes/cli-routing.module.js';

@Module({
    // AuthGuard が UserAccessTraceService を引くため、AppModule と同じく Global の UserLibsModule を入れる
    imports: [DatabaseModule, UserLibsModule, CliRoutingModule],
})
export class CliModule {}

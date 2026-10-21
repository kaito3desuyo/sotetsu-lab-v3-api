import { Module } from '@nestjs/common';
import { DatabaseModule } from './core/modules/database/database.module.js';
import { CliRoutingModule } from './routes/cli-routing.module.js';

@Module({
    imports: [DatabaseModule, CliRoutingModule],
})
export class CliModule {}

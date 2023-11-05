import { Module } from '@nestjs/common';
import { DatabaseModule } from './core/modules/database/database.module';
import { CliRoutingModule } from './routes/cli-routing.module';

@Module({
    imports: [DatabaseModule, CliRoutingModule],
})
export class CliModule {}

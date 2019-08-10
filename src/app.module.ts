import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './shared/modules/database.module';
import { MainModule } from './main/main.module';

@Module({
  imports: [DatabaseModule, MainModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

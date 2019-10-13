import { Module } from '@nestjs/common';
import { AgencyController } from './agency.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agency } from './agency.entity';
import { AgencyService } from './agency.service';

@Module({
  imports: [TypeOrmModule.forFeature([Agency])],
  controllers: [AgencyController],
  providers: [AgencyService],
})
export class AgencyModule {}

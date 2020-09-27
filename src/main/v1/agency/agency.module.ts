import { Module } from '@nestjs/common';
import { AgencyController } from './agency.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agency } from './agency.entity';
import { AgencyService } from './agency.service';
import { AuthModule } from 'src/core/auth/auth.module';

@Module({
    imports: [TypeOrmModule.forFeature([Agency]), AuthModule],
    controllers: [AgencyController],
    providers: [AgencyService],
})
export class AgencyModule {}

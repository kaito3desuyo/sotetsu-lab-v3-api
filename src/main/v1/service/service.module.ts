import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/auth/auth.module';
import { ServiceController } from './service.controller';
import { Service } from './service.entity';
import { ServiceService } from './service.service';

@Module({
    imports: [TypeOrmModule.forFeature([Service]), AuthModule],
    controllers: [ServiceController],
    providers: [ServiceService],
})
export class ServiceModule {}

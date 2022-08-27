import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/auth/auth.module';
import { TripBlockModel } from './infrastructure/models/trip-block.model';
import { TripBlockQuery } from './infrastructure/queries/trip-block.query';

@Module({
    imports: [TypeOrmModule.forFeature([TripBlockModel]), AuthModule],
    exports: [TripBlockQuery],
    providers: [TripBlockQuery],
})
export class TripBlockLibsModule {}

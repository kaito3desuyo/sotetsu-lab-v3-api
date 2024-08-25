import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/modules/auth/auth.module';
import { TripBlockCommand } from './infrastructure/commands/trip-block.command';
import { TripBlockModel } from './infrastructure/models/trip-block.model';
import { TripBlockQuery } from './infrastructure/queries/trip-block.query';

@Module({
    imports: [TypeOrmModule.forFeature([TripBlockModel]), AuthModule],
    exports: [TripBlockCommand, TripBlockQuery],
    providers: [TripBlockCommand, TripBlockQuery],
})
export class TripBlockLibsModule {}

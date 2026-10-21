import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../core/modules/auth/auth.module.js';
import { TripBlockCommand } from './infrastructure/commands/trip-block.command.js';
import { TripBlockModel } from './infrastructure/models/trip-block.model.js';
import { TripBlockQuery } from './infrastructure/queries/trip-block.query.js';

@Module({
    imports: [TypeOrmModule.forFeature([TripBlockModel]), AuthModule],
    exports: [TripBlockCommand, TripBlockQuery],
    providers: [TripBlockCommand, TripBlockQuery],
})
export class TripBlockLibsModule {}

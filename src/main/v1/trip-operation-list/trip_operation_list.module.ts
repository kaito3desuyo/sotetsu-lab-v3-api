import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/auth/auth.module';
import { TripOperationListController } from './trip_operation_list.controller';
import { TripOperationList } from './trip_operation_list.entity';
import { TripOperationListService } from './trip_operation_list.service';

@Module({
    imports: [TypeOrmModule.forFeature([TripOperationList]), AuthModule],
    controllers: [TripOperationListController],
    providers: [TripOperationListService],
})
export class TripOperationListModule {}

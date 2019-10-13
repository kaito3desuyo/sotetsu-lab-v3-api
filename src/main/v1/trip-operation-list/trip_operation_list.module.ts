import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripOperationList } from './trip_operation_list.entity';
import { TripOperationListController } from './trip_operation_list.controller';
import { TripOperationListService } from './trip_operation_list.service';
import { AuthService } from './../../../shared/services/auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([TripOperationList])],
  controllers: [TripOperationListController],
  providers: [TripOperationListService, AuthService],
})
export class TripOperationListModule {}

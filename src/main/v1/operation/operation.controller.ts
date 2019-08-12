import { Controller, Get } from '@nestjs/common';
import { Operation } from './operation.entity';
import { OperationService } from './operation.service';
import { OperationSighting } from './operation-sighting.entity';
import { OperationSightingService } from './operation-sightings.service';

@Controller()
export class OperationController {
  constructor(
    private operationService: OperationService,
    private operationSightingService: OperationSightingService,
  ) {}

  @Get()
  async getOperations(): Promise<Operation[]> {
    const operations = await this.operationService.findAll();
    return operations;
  }

  @Get('/sightings')
  async getOperationSightings(): Promise<OperationSighting[]> {
    const sightings = await this.operationSightingService.findAll();
    return sightings;
  }
}

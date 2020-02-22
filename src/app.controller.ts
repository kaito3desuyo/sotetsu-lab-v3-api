import { Controller, Get, HttpException } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Get()
    getHello(): any {
        return {
            message: 'Sotetsu Lab v3 API.',
        };
    }

    @Get('/health-check')
    getHealthCheck(): any {
        return {
            message: 'Sotetsu Lab v3 API.',
        };
    }
}

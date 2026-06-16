import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
    @Get()
    getHello(): { message: string } {
        return {
            message: 'Sotetsu Lab v3 API.',
        };
    }

    @Get('/health-check')
    getHealthCheck(): { message: string } {
        return {
            message: 'Sotetsu Lab v3 API.',
        };
    }
}

import { INestApplication } from '@nestjs/common';
import { createApp } from './app';

let app: INestApplication;

async function bootstrap(): Promise<void> {
    if (!app) {
        console.log('app initialized');
        app = await createApp();
    }

    await app.listen(3000);
}
bootstrap();

import { ServerlessAdapter, ServerlessHandler } from '@h4ad/serverless-adapter';
import { ApiGatewayV2Adapter } from '@h4ad/serverless-adapter/lib/adapters/aws';
import { ExpressFramework } from '@h4ad/serverless-adapter/lib/frameworks/express';
import { LazyFramework } from '@h4ad/serverless-adapter/lib/frameworks/lazy';
import { DefaultHandler } from '@h4ad/serverless-adapter/lib/handlers/default';
import { PromiseResolver } from '@h4ad/serverless-adapter/lib/resolvers/promise';
import { createApp } from './app';
import { INestApplication } from '@nestjs/common';

let app: INestApplication;

async function bootstrap(): Promise<any> {
    if (!app) {
        app = await createApp();
        await app.init();
    }

    return app.getHttpAdapter().getInstance();
}

const express = new ExpressFramework();
const framework = new LazyFramework(express, bootstrap);

export const main = async (event, context) => {
    if (event.source === 'serverless-plugin-warmup') {
        console.log('WarmUp - Lambda is warm!');
        await bootstrap();
        await new Promise((r) => setTimeout(r, 25));
        return 'Lambda is warm!';
    }

    return ServerlessAdapter.new(null)
        .setFramework(framework)
        .setHandler(new DefaultHandler())
        .setResolver(new PromiseResolver())
        .addAdapter(new ApiGatewayV2Adapter())
        .build()(event, context);
};

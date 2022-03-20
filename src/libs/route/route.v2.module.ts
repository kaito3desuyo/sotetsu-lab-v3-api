import { Module } from '@nestjs/common';
import { RouteV2Controller } from './presentation/route.v2.controller';
import { RouteLibsModule } from './route.libs.module';
import { RouteV2Service } from './usecase/route.v2.service';

@Module({
    imports: [RouteLibsModule],
    controllers: [RouteV2Controller],
    providers: [RouteV2Service],
})
export class RouteV2Module {}

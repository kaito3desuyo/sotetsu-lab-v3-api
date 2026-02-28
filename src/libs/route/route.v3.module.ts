import { Module } from '@nestjs/common';
import { RouteV3Controller } from './presentation/route.v3.controller';
import { RouteLibsModule } from './route.libs.module';
import { RouteV3Service } from './usecase/route.v3.service';

@Module({
    imports: [RouteLibsModule],
    controllers: [RouteV3Controller],
    providers: [RouteV3Service],
})
export class RouteV3Module {}

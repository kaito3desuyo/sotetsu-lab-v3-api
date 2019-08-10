import { Module } from '@nestjs/common';
import { ApiV1Module } from './v1/apiv1.module';

@Module({
  imports: [ApiV1Module],
})
export class MainModule {}

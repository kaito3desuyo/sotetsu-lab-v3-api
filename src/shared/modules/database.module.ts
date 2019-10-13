import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
      synchronize: false,
      logging: true,
    }),
  ],
})
export class DatabaseModule {}

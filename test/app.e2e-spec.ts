import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { AgencyModel } from '../src/libs/agency/infrastructure/models/agency.model.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  // アプリが import したモデルと TypeORM が持つメタデータのクラスが同じもの（2 重に読まれていない）
  it('TypeORM がアプリと同じモデルのクラスを持つ', () => {
    const dataSource = app.get(DataSource);
    expect(dataSource.hasMetadata(AgencyModel)).toBe(true);
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({ message: 'Sotetsu Lab v3 API.' });
  });
});

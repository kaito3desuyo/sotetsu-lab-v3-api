import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('GET /', () => {
    it('should return API name message', () => {
      expect(appController.getHello()).toEqual({
        message: 'Sotetsu Lab v3 API.',
      });
    });
  });

  describe('GET /health-check', () => {
    it('should return API name message', () => {
      expect(appController.getHealthCheck()).toEqual({
        message: 'Sotetsu Lab v3 API.',
      });
    });
  });
});

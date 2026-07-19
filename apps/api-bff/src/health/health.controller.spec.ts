import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return health status', () => {
    expect(controller.getHealth()).toEqual({ status: 'ok' });
  });

  it('should return liveness status', () => {
    expect(controller.getLiveness()).toEqual({ status: 'ok' });
  });

  it('should return readiness status', () => {
    expect(controller.getReadiness()).toEqual({ status: 'ready' });
  });
});

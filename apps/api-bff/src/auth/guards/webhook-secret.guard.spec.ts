import {
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { WebhookSecretGuard } from './webhook-secret.guard';

describe('WebhookSecretGuard', () => {
  const expectedSecret = 'test-webhook-secret';
  let config: Pick<ConfigService, 'get'>;
  let guard: WebhookSecretGuard;

  const contextFor = (headers: Request['headers']): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    config = {
      get: jest.fn().mockReturnValue(expectedSecret),
    };
    guard = new WebhookSecretGuard(config as ConfigService);
  });

  it('allows a request with the configured secret', () => {
    expect(
      guard.canActivate(contextFor({ 'x-webhook-secret': expectedSecret })),
    ).toBe(true);
  });

  it('rejects a request with a missing or invalid secret', () => {
    expect(() => guard.canActivate(contextFor({}))).toThrow(
      UnauthorizedException,
    );
    expect(() =>
      guard.canActivate(contextFor({ 'x-webhook-secret': 'wrong-secret' })),
    ).toThrow(UnauthorizedException);
  });

  it('does not write secret material to console logs', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    try {
      expect(() =>
        guard.canActivate(contextFor({ 'x-webhook-secret': 'wrong-secret' })),
      ).toThrow(UnauthorizedException);
      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});

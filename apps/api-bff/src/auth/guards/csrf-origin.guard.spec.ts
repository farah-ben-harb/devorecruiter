import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { CsrfOriginGuard } from './csrf-origin.guard';

describe('CsrfOriginGuard', () => {
  const makeContext = (headers: Request['headers']): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    }) as ExecutionContext;

  const makeGuard = (nodeEnv = 'production') =>
    new CsrfOriginGuard({
      getOrThrow: jest.fn().mockReturnValue('https://app.example.test'),
      get: jest.fn((key: string) => (key === 'NODE_ENV' ? nodeEnv : undefined)),
    } as unknown as ConfigService);

  it('allows a configured browser origin', () => {
    expect(
      makeGuard().canActivate(
        makeContext({ origin: 'https://app.example.test' }),
      ),
    ).toBe(true);
  });

  it('rejects an unconfigured browser origin', () => {
    expect(() =>
      makeGuard().canActivate(
        makeContext({ origin: 'https://attacker.example.test' }),
      ),
    ).toThrow('Origine de requête non autorisée');
  });

  it('uses Referer when Origin is absent', () => {
    expect(() =>
      makeGuard().canActivate(
        makeContext({ referer: 'https://attacker.example.test/page' }),
      ),
    ).toThrow('Origine de requête non autorisée');
  });

  it('allows requests without browser origin headers for local tooling', () => {
    expect(makeGuard().canActivate(makeContext({}))).toBe(true);
  });
});

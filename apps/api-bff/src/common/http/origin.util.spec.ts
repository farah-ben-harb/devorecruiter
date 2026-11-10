import { isAllowedOrigin } from './origin.util';

describe('isAllowedOrigin', () => {
  const configuredOrigins = ['https://app.example.test'];

  it('allows an explicitly configured origin', () => {
    expect(
      isAllowedOrigin('https://app.example.test', configuredOrigins, false),
    ).toBe(true);
  });

  it('allows local development origins only in development', () => {
    expect(isAllowedOrigin('http://localhost:4200', [], true)).toBe(true);
    expect(isAllowedOrigin('http://localhost:4200', [], false)).toBe(false);
  });

  it('allows development Cloudflare tunnels over HTTPS', () => {
    expect(isAllowedOrigin('https://demo.trycloudflare.com', [], true)).toBe(
      true,
    );
    expect(isAllowedOrigin('http://demo.trycloudflare.com', [], true)).toBe(
      false,
    );
  });

  it('does not accept lookalike hostnames', () => {
    expect(isAllowedOrigin('https://localhost.attacker.test', [], true)).toBe(
      false,
    );
  });
});

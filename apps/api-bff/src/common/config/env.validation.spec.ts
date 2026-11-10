import 'reflect-metadata';
import { envValidationSchema } from './env.validation';

const validEnvironment = {
  NODE_ENV: 'test',
  CORS_ORIGIN: 'http://localhost:4200,https://app.example.test',
  FRONTEND_URL: 'https://app.example.test',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: 5432,
  DATABASE_USER: 'test-user',
  DATABASE_PASSWORD: 'test-password',
  DATABASE_NAME: 'test-db',
  JWT_SECRET: 'test-jwt-secret-1234',
  JWT_REFRESH_SECRET: 'test-refresh-secret-1234',
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_CALLBACK_URL: 'https://api.example.test/auth/google/callback',
  N8N_WEBHOOK_URL: 'https://n8n.example.test/webhook',
  FASTAPI_BASE_URL: 'https://fastapi.example.test',
};

describe('envValidationSchema', () => {
  it('loads without crashing', () => {
    expect(envValidationSchema).toBeDefined();
  });

  it('accepts HTTP and HTTPS origins and callback URLs', () => {
    const { error } = envValidationSchema.validate(validEnvironment);

    expect(error).toBeUndefined();
  });

  it('rejects non-HTTP frontend and callback URLs', () => {
    const { error } = envValidationSchema.validate({
      ...validEnvironment,
      FRONTEND_URL: 'javascript:alert(1)',
      GOOGLE_CALLBACK_URL: 'javascript:alert(1)',
    });

    expect(error).toBeDefined();
  });

  it('requires secure cookies in production', () => {
    const { error } = envValidationSchema.validate({
      ...validEnvironment,
      NODE_ENV: 'production',
      AUTH_COOKIE_SECURE: false,
    });

    expect(
      error?.details.some(({ path }) => path[0] === 'AUTH_COOKIE_SECURE'),
    ).toBe(true);
  });
});

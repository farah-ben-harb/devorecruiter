import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  CORS_ORIGIN: Joi.string()
    .custom((value: unknown, helpers): string => {
      if (typeof value !== 'string')
        return helpers.error('string.uri') as never;
      const origins = value.split(',').map((origin) => origin.trim());
      const valid = origins.every((origin: string) => {
        try {
          const url = new URL(origin);
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      });
      return valid ? value : (helpers.error('string.uri') as never);
    })
    .required(),
  FRONTEND_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
  AUTH_COOKIE_SAMESITE: Joi.string()
    .valid('lax', 'strict', 'none')
    .default('lax'),
  AUTH_COOKIE_SECURE: Joi.boolean().when('NODE_ENV', {
    is: 'production',
    then: Joi.valid(true).required(),
    otherwise: Joi.boolean().default(false),
  }),

  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().port().required(),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().allow('').required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_SYNCHRONIZE: Joi.boolean().default(false),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),

  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_CALLBACK_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
  APP_FRONTEND_URL: Joi.string().uri().optional(),

  N8N_WEBHOOK_URL: Joi.string().uri().required(),
  FASTAPI_BASE_URL: Joi.string().uri().optional(),
  RAG_URL: Joi.string().uri().optional(),
  RAG_INTERNAL_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
}).or('FASTAPI_BASE_URL', 'RAG_URL');

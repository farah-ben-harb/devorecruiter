import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { JobPostsModule } from './job-posts/job-posts.module';
import { CandidateModule } from './candidates/candidate.module';
import { ResumeEvaluationModule } from './resume-evaluations/resume-evaluations.module';
import { JobPostEvaluationModule } from './job-post-evaluations/job-post-evaluations.module';
import { envValidationSchema } from './common/config/env.validation';
import { HealthModule } from './health/health.module';
import { TechnicalEvaluationModule } from './technical-evaluations/technical-evaluations.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AssistanceModule } from './assistance/assistace.module';
import { RhAssistantModule } from './rh-assistant/rh-assistant.module';
import { ExportModule } from './export/export.module';
import { ImportModule } from './import/import.module';
import { JobOfferModule } from './job-offers/job-offers.module';
import { UnifiedAssistantModule } from './unified-assistant/unified-assistant.module';
import { ChatbotModule } from './chatbot/chatbot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow<string>('DATABASE_HOST'),
        port: configService.getOrThrow<number>('DATABASE_PORT'),
        username: configService.getOrThrow<string>('DATABASE_USER'),
        password: configService.getOrThrow<string>('DATABASE_PASSWORD'),
        database: configService.getOrThrow<string>('DATABASE_NAME'),
        autoLoadEntities: true,
        synchronize: configService.get<boolean>('DATABASE_SYNCHRONIZE', false),
      }),
    }),
    UsersModule,
    AuthModule,
    JobPostsModule,
    CandidateModule,
    ResumeEvaluationModule,
    JobPostEvaluationModule,
    HealthModule,
    TechnicalEvaluationModule,
    DashboardModule,
    AssistanceModule,
    RhAssistantModule,
    ExportModule,
    ImportModule,
    JobOfferModule,
    UnifiedAssistantModule,
    ChatbotModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}

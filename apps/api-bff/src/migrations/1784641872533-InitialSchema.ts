import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1784641872533 implements MigrationInterface {
  name = 'InitialSchema1784641872533';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "picture" character varying, "roles" text NOT NULL, "is_activated" boolean NOT NULL DEFAULT true, "refresh_token" text, "googleAccessToken" text, "googleRefreshToken" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "last_login" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_email" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE TABLE "rh_conversations" ("id" SERIAL NOT NULL, "title" character varying NOT NULL DEFAULT 'Nouvelle conversation', "user_id" integer NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "isPinned" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fd98dfb0433a7a3d31304319a20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."rh_messages_role_enum" AS ENUM('user', 'assistant')`,
    );
    await queryRunner.query(
      `CREATE TABLE "rh_messages" ("id" SERIAL NOT NULL, "conversation_id" integer NOT NULL, "role" "public"."rh_messages_role_enum" NOT NULL, "content" text NOT NULL, "sources" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_db7312ba420d2ecac5107cfb336" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."job_posts_status_enum" AS ENUM('raw', 'processing', 'unified', 'error')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."job_posts_jobstatus_enum" AS ENUM('open', 'closed_with_hire', 'closed_without_hire')`,
    );
    await queryRunner.query(
      `CREATE TABLE "job_posts" ("id" SERIAL NOT NULL, "googleDriveFileId" character varying, "name" character varying NOT NULL, "type" character varying, "url" character varying, "googleDocId" text, "unifiedUrl" text, "company" text, "startDate" text, "evaluationsFolderId" text, "status" "public"."job_posts_status_enum" NOT NULL DEFAULT 'raw', "title" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "requiresCoding" boolean, "hasQcm" boolean, "unifiedDocxId" text, "jobStatus" "public"."job_posts_jobstatus_enum", "linkedCandidateIds" jsonb NOT NULL DEFAULT '[]', CONSTRAINT "PK_1ecf5b9e46cd2940d254204a73a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f98925b58d88242eba809a8214" ON "job_posts" ("googleDriveFileId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "resume_evaluation" ("id" SERIAL NOT NULL, "resumeFileId" character varying NOT NULL, "resumeName" character varying NOT NULL, "jobPostId" integer NOT NULL, "jobPostGoogleDriveFileId" character varying NOT NULL, "scoreGlobal" integer NOT NULL, "criteria" jsonb NOT NULL, "strengths" text array NOT NULL, "weaknesses" text array NOT NULL, "resume" text NOT NULL, "recommendation" character varying NOT NULL, "status" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "highlightedFileId" character varying, "isOutdated" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_bec4c7502ba4a5ab62d934e48fe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."job_post_criteria_source_enum" AS ENUM('n8n_unification', 'standalone')`,
    );
    await queryRunner.query(
      `CREATE TABLE "job_post_criteria" ("id" SERIAL NOT NULL, "jobPostId" integer NOT NULL, "intitulePoste" text, "competencesTechniquesRequises" jsonb NOT NULL DEFAULT '[]', "competencesGeneralesRequises" jsonb NOT NULL DEFAULT '[]', "experienceMinimaleAnnees" integer, "formationRequise" text, "languesRequises" jsonb NOT NULL DEFAULT '[]', "missionsPrincipales" jsonb NOT NULL DEFAULT '[]', "certificationsRequises" jsonb NOT NULL DEFAULT '[]', "sections" jsonb, "sectionLabels" jsonb, "source" "public"."job_post_criteria_source_enum" NOT NULL DEFAULT 'n8n_unification', "rawJson" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_bd659ac833a4be3c63da9d5565" UNIQUE ("jobPostId"), CONSTRAINT "PK_e048ab828f4c598e3f629183cda" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bd659ac833a4be3c63da9d5565" ON "job_post_criteria" ("jobPostId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "global_criteria" ("id" SERIAL NOT NULL, "label" text NOT NULL, "description" text, "category" text, "order" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fd528c02cc720cafdd5ca5e2097" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "criteria_category" ("id" SERIAL NOT NULL, "value" text NOT NULL, "label" text NOT NULL, "order" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a46ad9cdaaf607eadcab9842ba6" UNIQUE ("value"), CONSTRAINT "PK_ff6c872b78f90aeabbbe3f625dd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."candidates_status_enum" AS ENUM('pending', 'processing', 'done', 'error')`,
    );
    await queryRunner.query(
      `CREATE TABLE "candidates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "brutDriveId" character varying, "brutDriveName" character varying, "brutDriveLink" character varying, "name" character varying, "firstName" character varying, "unifieDriveId" character varying, "unifieDriveName" character varying, "unifieDriveLink" character varying, "status" "public"."candidates_status_enum" NOT NULL DEFAULT 'pending', "email" character varying, "githubUsername" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_140681296bf033ab1eb95288abb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_0a04386fed04bdf33592f9bc5e" ON "candidates" ("brutDriveId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_6257ebfbf3a5d98bcaaac6a5b0" ON "candidates" ("unifieDriveId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."job_post_evaluation_status_enum" AS ENUM('pending', 'running', 'done', 'error')`,
    );
    await queryRunner.query(
      `CREATE TABLE "job_post_evaluation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "candidateId" uuid NOT NULL, "status" "public"."job_post_evaluation_status_enum" NOT NULL DEFAULT 'done', "matches" jsonb, "totalMatch" integer NOT NULL DEFAULT '0', "errorMessage" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "completedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_c278a5e7d49886b7b8a28b1bfcf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c9cd19ebfea033e90b3cfc7313" ON "job_post_evaluation" ("candidateId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6a93fe740d9796a4022c1eb646" ON "job_post_evaluation" ("candidateId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "job_offers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "promptLibre" text NOT NULL, "titre" character varying(255) NOT NULL, "accroche" text NOT NULL, "formatLinkedin" text NOT NULL, "missions" jsonb NOT NULL, "profil" jsonb NOT NULL, "avantages" jsonb NOT NULL, "hashtags" jsonb NOT NULL, "motsCles" jsonb NOT NULL, "isPublished" boolean NOT NULL DEFAULT false, "user_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "jobPostId" integer, CONSTRAINT "PK_9a54d36bd6829979f945defdeb5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "chatbot_conversations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sessionId" character varying NOT NULL, "userId" character varying NOT NULL, "userMessage" text NOT NULL, "assistantResponse" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b0b9e3727249e6c93ac30c14bca" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_memory" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" integer NOT NULL, "summary" text, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_d4224dba31d476625e80af2667" UNIQUE ("user_id"), CONSTRAINT "PK_590d68904c4318fdcfafd9f9fc5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "conversations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "user_id" integer NOT NULL, "is_pinned" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."messages_role_enum" AS ENUM('user', 'assistant')`,
    );
    await queryRunner.query(
      `CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role" "public"."messages_role_enum" NOT NULL, "content" text NOT NULL, "conversation_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."quizzes_status_enum" AS ENUM('pending', 'in_progress', 'completed', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "quizzes" ("id" SERIAL NOT NULL, "jobPostId" integer NOT NULL, "title" character varying NOT NULL, "status" "public"."quizzes_status_enum" NOT NULL DEFAULT 'pending', "version" character varying NOT NULL DEFAULT '1.0', "index" integer, "quizContent" text, "quizAnswerKey" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b24f0f7662cf6b3a0e7dba0a1b4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."technical_evaluations_status_enum" AS ENUM('pending', 'in_progress', 'completed', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "technical_evaluations" ("id" SERIAL NOT NULL, "jobPostId" integer NOT NULL, "title" character varying NOT NULL, "status" "public"."technical_evaluations_status_enum" NOT NULL DEFAULT 'pending', "driveFileId" text, "driveFileUrl" text, "version" character varying NOT NULL DEFAULT '1.0', "htmlContent" text, "gitRepoUrl" text, "pdfUrl" text, "index" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying, "quizContent" text, "quizAnswerKey" text, CONSTRAINT "PK_2250e5ce2fcbc35852a3e441cc0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."invitations_status_enum" AS ENUM('sent', 'opened', 'submitted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "invitations" ("id" SERIAL NOT NULL, "candidateId" character varying NOT NULL, "candidateName" character varying NOT NULL, "candidateFirstName" character varying NOT NULL, "candidateEmail" character varying NOT NULL, "jobPostId" integer NOT NULL, "evaluationId" integer NOT NULL, "dueDate" date NOT NULL, "status" "public"."invitations_status_enum" NOT NULL DEFAULT 'sent', "sentAt" TIMESTAMP NOT NULL DEFAULT now(), "candidateResumeFileId" character varying, "gitRepoUrl" character varying, "quizToken" character varying, CONSTRAINT "UQ_083d508012bbf2169ccd1680ac2" UNIQUE ("quizToken"), CONSTRAINT "PK_5dec98cfdfd562e4ad3648bbb07" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."candidate_quiz_results_status_enum" AS ENUM('pending', 'completed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "candidate_quiz_results" ("id" SERIAL NOT NULL, "invitationId" integer NOT NULL, "candidateId" character varying NOT NULL, "evaluationId" integer NOT NULL, "answersJson" text NOT NULL, "totalQuestions" integer NOT NULL DEFAULT '0', "correctAnswers" integer NOT NULL DEFAULT '0', "scorePercent" integer NOT NULL DEFAULT '0', "detailJson" text, "aiFeedbackJson" text, "durationSeconds" integer, "status" "public"."candidate_quiz_results_status_enum" NOT NULL DEFAULT 'completed', "submittedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bdad811443f09e487690b0be83b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "candidate_code_evaluations" ("id" SERIAL NOT NULL, "invitationId" integer NOT NULL, "candidateId" character varying NOT NULL, "evaluationId" integer NOT NULL, "branch" character varying, "globalScore" integer, "technicalScore" integer, "qualityScore" integer, "feedback" text, "strengths" text, "improvements" text, "recommendation" character varying, "rawAiResponse" text, "evaluatedAt" TIMESTAMP NOT NULL DEFAULT now(), "requirementsAnalysis" text, CONSTRAINT "PK_84df3f3ce82e5b05b68cf6ed506" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "rh_conversations" ADD CONSTRAINT "FK_adf30954eda4615b67d2aba542b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rh_messages" ADD CONSTRAINT "FK_c9317dcc76dff9675100a087033" FOREIGN KEY ("conversation_id") REFERENCES "rh_conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "resume_evaluation" ADD CONSTRAINT "FK_01370478ea6bc1a4b61a7214f02" FOREIGN KEY ("jobPostId") REFERENCES "job_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_post_criteria" ADD CONSTRAINT "FK_bd659ac833a4be3c63da9d55654" FOREIGN KEY ("jobPostId") REFERENCES "job_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_post_evaluation" ADD CONSTRAINT "FK_c9cd19ebfea033e90b3cfc7313a" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_offers" ADD CONSTRAINT "FK_cce1825e75f9dce371bc7ecc741" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_memory" ADD CONSTRAINT "FK_d4224dba31d476625e80af26679" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD CONSTRAINT "FK_3a9ae579e61e81cc0e989afeb4a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_3bc55a7c3f9ed54b520bb5cfe23" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quizzes" ADD CONSTRAINT "FK_4af6fc7e22b58ed82f70ae3ab43" FOREIGN KEY ("jobPostId") REFERENCES "job_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "technical_evaluations" ADD CONSTRAINT "FK_2acd92c83de23f52483207f0b05" FOREIGN KEY ("jobPostId") REFERENCES "job_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD CONSTRAINT "FK_b342a13e43f31b32d0fed3dac6f" FOREIGN KEY ("evaluationId") REFERENCES "technical_evaluations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "candidate_quiz_results" ADD CONSTRAINT "FK_2b27d160dc8665a323c7aeb72c1" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "candidate_quiz_results" DROP CONSTRAINT "FK_2b27d160dc8665a323c7aeb72c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP CONSTRAINT "FK_b342a13e43f31b32d0fed3dac6f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "technical_evaluations" DROP CONSTRAINT "FK_2acd92c83de23f52483207f0b05"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quizzes" DROP CONSTRAINT "FK_4af6fc7e22b58ed82f70ae3ab43"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_3bc55a7c3f9ed54b520bb5cfe23"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP CONSTRAINT "FK_3a9ae579e61e81cc0e989afeb4a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_memory" DROP CONSTRAINT "FK_d4224dba31d476625e80af26679"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_offers" DROP CONSTRAINT "FK_cce1825e75f9dce371bc7ecc741"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_post_evaluation" DROP CONSTRAINT "FK_c9cd19ebfea033e90b3cfc7313a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_post_criteria" DROP CONSTRAINT "FK_bd659ac833a4be3c63da9d55654"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resume_evaluation" DROP CONSTRAINT "FK_01370478ea6bc1a4b61a7214f02"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rh_messages" DROP CONSTRAINT "FK_c9317dcc76dff9675100a087033"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rh_conversations" DROP CONSTRAINT "FK_adf30954eda4615b67d2aba542b"`,
    );
    await queryRunner.query(`DROP TABLE "candidate_code_evaluations"`);
    await queryRunner.query(`DROP TABLE "candidate_quiz_results"`);
    await queryRunner.query(
      `DROP TYPE "public"."candidate_quiz_results_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "invitations"`);
    await queryRunner.query(`DROP TYPE "public"."invitations_status_enum"`);
    await queryRunner.query(`DROP TABLE "technical_evaluations"`);
    await queryRunner.query(
      `DROP TYPE "public"."technical_evaluations_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "quizzes"`);
    await queryRunner.query(`DROP TYPE "public"."quizzes_status_enum"`);
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TYPE "public"."messages_role_enum"`);
    await queryRunner.query(`DROP TABLE "conversations"`);
    await queryRunner.query(`DROP TABLE "user_memory"`);
    await queryRunner.query(`DROP TABLE "chatbot_conversations"`);
    await queryRunner.query(`DROP TABLE "job_offers"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6a93fe740d9796a4022c1eb646"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c9cd19ebfea033e90b3cfc7313"`,
    );
    await queryRunner.query(`DROP TABLE "job_post_evaluation"`);
    await queryRunner.query(
      `DROP TYPE "public"."job_post_evaluation_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6257ebfbf3a5d98bcaaac6a5b0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0a04386fed04bdf33592f9bc5e"`,
    );
    await queryRunner.query(`DROP TABLE "candidates"`);
    await queryRunner.query(`DROP TYPE "public"."candidates_status_enum"`);
    await queryRunner.query(`DROP TABLE "criteria_category"`);
    await queryRunner.query(`DROP TABLE "global_criteria"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bd659ac833a4be3c63da9d5565"`,
    );
    await queryRunner.query(`DROP TABLE "job_post_criteria"`);
    await queryRunner.query(
      `DROP TYPE "public"."job_post_criteria_source_enum"`,
    );
    await queryRunner.query(`DROP TABLE "resume_evaluation"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f98925b58d88242eba809a8214"`,
    );
    await queryRunner.query(`DROP TABLE "job_posts"`);
    await queryRunner.query(`DROP TYPE "public"."job_posts_jobstatus_enum"`);
    await queryRunner.query(`DROP TYPE "public"."job_posts_status_enum"`);
    await queryRunner.query(`DROP TABLE "rh_messages"`);
    await queryRunner.query(`DROP TYPE "public"."rh_messages_role_enum"`);
    await queryRunner.query(`DROP TABLE "rh_conversations"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_email"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}

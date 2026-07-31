-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RetrievalStatus" AS ENUM ('PENDING', 'SUCCESS', 'BLOCKED', 'TIMEOUT', 'UNSUPPORTED_CONTENT', 'TOO_LARGE', 'NOT_FOUND', 'ERROR', 'MANUAL');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('QUEUED', 'RUNNING', 'AWAITING_REVIEW', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AnalysisStage" AS ENUM ('RETRIEVING_SOURCES', 'EXTRACTING_PROFILE', 'BUILDING_TWIN', 'SCORING_ECOSYSTEMS', 'DESIGNING_SEQUENCE', 'GENERATING_ARCHITECTURE', 'BUILDING_RISK_REGISTER', 'CREATING_EXECUTION_PLAN', 'FINALIZING', 'DONE');

-- CreateEnum
CREATE TYPE "ReportSectionType" AS ENUM ('EXECUTIVE_SUMMARY', 'DIGITAL_TWIN', 'EXPANSION_MAP', 'CHAIN_SCORECARD', 'ARCHITECTURE', 'RISK_REGISTER', 'EXECUTION_PLAN', 'TECHNICAL_BRIEF', 'SOURCES_ASSUMPTIONS');

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "reportsGenerated" INTEGER NOT NULL DEFAULT 0,
    "sectionsRegenerated" INTEGER NOT NULL DEFAULT 0,
    "reportLimitOverride" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "docsUrl" TEXT,
    "description" TEXT,
    "currentChains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "wizardInput" JSONB,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_documents" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "resolvedUrl" TEXT,
    "title" TEXT,
    "extractedText" TEXT,
    "retrievalStatus" "RetrievalStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "contentHash" TEXT,
    "byteSize" INTEGER,
    "wordCount" INTEGER,
    "kind" TEXT NOT NULL DEFAULT 'website',
    "retrievedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'QUEUED',
    "currentStage" "AnalysisStage" NOT NULL DEFAULT 'RETRIEVING_SOURCES',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "scoringVersion" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "generationMode" TEXT NOT NULL DEFAULT 'live',
    "confidence" INTEGER,
    "recommendedChain" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_events" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "stage" "AnalysisStage" NOT NULL,
    "state" TEXT NOT NULL,
    "message" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_twins" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "structuredData" JSONB NOT NULL,
    "confidence" INTEGER NOT NULL,
    "assumptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missingData" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fieldSources" JSONB,
    "userConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "userEditedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_twins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chain_scores" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "chainSlug" TEXT NOT NULL,
    "chainName" TEXT NOT NULL,
    "deterministicScore" DOUBLE PRECISION NOT NULL,
    "aiAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "confidence" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "recommendation" TEXT NOT NULL DEFAULT 'monitor',
    "scoreBreakdown" JSONB NOT NULL,
    "explanation" JSONB,
    "blockers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missingData" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chain_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_sections" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "sectionType" "ReportSectionType" NOT NULL,
    "content" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "modelName" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_data_snapshots" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'live',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_data_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_clerkUserId_key" ON "user_profiles"("clerkUserId");

-- CreateIndex
CREATE INDEX "user_profiles_createdAt_idx" ON "user_profiles"("createdAt");

-- CreateIndex
CREATE INDEX "projects_userId_createdAt_idx" ON "projects"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "projects_userId_name_idx" ON "projects"("userId", "name");

-- CreateIndex
CREATE INDEX "source_documents_projectId_createdAt_idx" ON "source_documents"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "source_documents_contentHash_idx" ON "source_documents"("contentHash");

-- CreateIndex
CREATE INDEX "analyses_userId_createdAt_idx" ON "analyses"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "analyses_projectId_createdAt_idx" ON "analyses"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "analyses_status_idx" ON "analyses"("status");

-- CreateIndex
CREATE UNIQUE INDEX "analyses_userId_idempotencyKey_key" ON "analyses"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "analysis_events_analysisId_createdAt_idx" ON "analysis_events"("analysisId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "digital_twins_analysisId_key" ON "digital_twins"("analysisId");

-- CreateIndex
CREATE INDEX "chain_scores_analysisId_rank_idx" ON "chain_scores"("analysisId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "chain_scores_analysisId_chainSlug_key" ON "chain_scores"("analysisId", "chainSlug");

-- CreateIndex
CREATE INDEX "report_sections_analysisId_idx" ON "report_sections"("analysisId");

-- CreateIndex
CREATE UNIQUE INDEX "report_sections_analysisId_sectionType_key" ON "report_sections"("analysisId", "sectionType");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");

-- CreateIndex
CREATE INDEX "share_links_analysisId_idx" ON "share_links"("analysisId");

-- CreateIndex
CREATE INDEX "share_links_token_isActive_idx" ON "share_links"("token", "isActive");

-- CreateIndex
CREATE INDEX "activity_events_userId_createdAt_idx" ON "activity_events"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "activity_events_entityType_entityId_idx" ON "activity_events"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "external_data_snapshots_source_fetchedAt_idx" ON "external_data_snapshots"("source", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "external_data_snapshots_source_key" ON "external_data_snapshots"("source");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_events" ADD CONSTRAINT "analysis_events_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_twins" ADD CONSTRAINT "digital_twins_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chain_scores" ADD CONSTRAINT "chain_scores_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_sections" ADD CONSTRAINT "report_sections_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;


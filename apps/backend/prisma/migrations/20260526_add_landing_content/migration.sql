-- CreateTable
CREATE TABLE "landing_content" (
    "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "section"     TEXT NOT NULL,
    "content"     JSONB NOT NULL DEFAULT '{}',
    "updatedById" TEXT,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "landing_content_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "landing_content_section_key" UNIQUE ("section")
);

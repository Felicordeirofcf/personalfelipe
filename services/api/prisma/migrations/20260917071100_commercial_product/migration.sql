ALTER TABLE "User" ADD COLUMN "cpf" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
UPDATE "User" SET "cpf" = CONCAT('000000000', ROW_NUMBER() OVER (ORDER BY "createdAt")), "passwordHash" = 'legacy-account';
ALTER TABLE "User" ALTER COLUMN "cpf" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");

CREATE TABLE "Feedback" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "fatigueLevel" INTEGER NOT NULL,
  "jointPainLevel" INTEGER NOT NULL,
  "loadDifficulty" INTEGER NOT NULL,
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Feedback_userId_createdAt_idx" ON "Feedback"("userId", "createdAt");
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Spreadsheet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "fileUrl" TEXT,
  "externalUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Spreadsheet_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Spreadsheet_userId_createdAt_idx" ON "Spreadsheet"("userId", "createdAt");
ALTER TABLE "Spreadsheet" ADD CONSTRAINT "Spreadsheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

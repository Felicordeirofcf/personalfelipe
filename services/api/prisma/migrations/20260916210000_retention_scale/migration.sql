CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'OVERDUE', 'CANCELED');

ALTER TABLE "User"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
  ADD COLUMN "mercadoPagoCustomerId" TEXT;

ALTER TABLE "SplitExercise" ADD COLUMN "videoUrl" TEXT;

CREATE TABLE "CheckIn" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "painLevel" INTEGER NOT NULL,
  "painLocation" TEXT,
  "fatigueLevel" INTEGER NOT NULL,
  "weightKg" DOUBLE PRECISION,
  "notes" TEXT,
  "photoUrls" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'MERCADO_PAGO',
  "externalPaymentId" TEXT NOT NULL,
  "externalReference" TEXT,
  "status" "SubscriptionStatus" NOT NULL,
  "amount" DOUBLE PRECISION,
  "currency" TEXT,
  "lastEvent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_mercadoPagoCustomerId_key" ON "User"("mercadoPagoCustomerId");
CREATE INDEX "CheckIn_userId_createdAt_idx" ON "CheckIn"("userId", "createdAt");
CREATE UNIQUE INDEX "Subscription_externalPaymentId_key" ON "Subscription"("externalPaymentId");
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_painLevel_check" CHECK ("painLevel" BETWEEN 0 AND 10);
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_fatigueLevel_check" CHECK ("fatigueLevel" BETWEEN 0 AND 10);
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_weightKg_check" CHECK ("weightKg" IS NULL OR "weightKg" BETWEEN 20 AND 500);

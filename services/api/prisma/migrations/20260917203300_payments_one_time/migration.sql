CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mpPaymentId" TEXT,
  "mpPreferenceId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 40.0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_mpPaymentId_key" ON "Payment"("mpPaymentId");
CREATE INDEX "Payment_userId_status_idx" ON "Payment"("userId", "status");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

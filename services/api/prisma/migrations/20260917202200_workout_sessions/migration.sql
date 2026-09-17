CREATE TABLE "WorkoutSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "workoutId" TEXT,
  "dayTitle" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkoutSession_userId_completedAt_idx" ON "WorkoutSession"("userId", "completedAt");

ALTER TABLE "WorkoutSession"
  ADD CONSTRAINT "WorkoutSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

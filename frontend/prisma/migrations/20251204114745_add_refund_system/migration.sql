-- CreateTable
CREATE TABLE "RefundRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "jobId" TEXT,
    "transactionId" TEXT,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "failureStage" TEXT,
    "autoRefund" BOOLEAN NOT NULL DEFAULT false,
    "adminNotes" TEXT,
    "processedAt" DATETIME,
    "processedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RefundRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RefundRecovery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "stripeEventId" TEXT,
    "creditsOwed" INTEGER NOT NULL,
    "originalAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    CONSTRAINT "RefundRecovery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CreditTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "jobId" TEXT,
    "stripeEventId" TEXT,
    "refunded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CreditTransaction" ("amount", "createdAt", "description", "id", "metadata", "type", "userId") SELECT "amount", "createdAt", "description", "id", "metadata", "type", "userId" FROM "CreditTransaction";
DROP TABLE "CreditTransaction";
ALTER TABLE "new_CreditTransaction" RENAME TO "CreditTransaction";
CREATE INDEX "CreditTransaction_userId_idx" ON "CreditTransaction"("userId");
CREATE INDEX "CreditTransaction_createdAt_idx" ON "CreditTransaction"("createdAt");
CREATE INDEX "CreditTransaction_jobId_idx" ON "CreditTransaction"("jobId");
CREATE INDEX "CreditTransaction_stripeEventId_idx" ON "CreditTransaction"("stripeEventId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "accountBlockedForRefund" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "password", "updatedAt") SELECT "createdAt", "email", "id", "name", "password", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RefundRequest_userId_idx" ON "RefundRequest"("userId");

-- CreateIndex
CREATE INDEX "RefundRequest_status_idx" ON "RefundRequest"("status");

-- CreateIndex
CREATE INDEX "RefundRequest_jobId_idx" ON "RefundRequest"("jobId");

-- CreateIndex
CREATE INDEX "RefundRequest_createdAt_idx" ON "RefundRequest"("createdAt");

-- CreateIndex
CREATE INDEX "RefundRecovery_userId_idx" ON "RefundRecovery"("userId");

-- CreateIndex
CREATE INDEX "RefundRecovery_status_idx" ON "RefundRecovery"("status");

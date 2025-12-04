-- CreateTable
CREATE TABLE "AlertDeliveryLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alertname" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "instance" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "channels" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "dashboardUrl" TEXT,
    "firingCount" INTEGER NOT NULL DEFAULT 1,
    "resolvedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "responseTime" INTEGER,
    "groupKey" TEXT,
    "fingerprint" TEXT,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AlertChannelDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alertLogId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "lastAttempt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseCode" INTEGER,
    "responseBody" TEXT,
    "errorMessage" TEXT,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AlertDeliveryLog_alertname_idx" ON "AlertDeliveryLog"("alertname");

-- CreateIndex
CREATE INDEX "AlertDeliveryLog_severity_idx" ON "AlertDeliveryLog"("severity");

-- CreateIndex
CREATE INDEX "AlertDeliveryLog_service_idx" ON "AlertDeliveryLog"("service");

-- CreateIndex
CREATE INDEX "AlertDeliveryLog_status_idx" ON "AlertDeliveryLog"("status");

-- CreateIndex
CREATE INDEX "AlertDeliveryLog_createdAt_idx" ON "AlertDeliveryLog"("createdAt");

-- CreateIndex
CREATE INDEX "AlertDeliveryLog_groupKey_idx" ON "AlertDeliveryLog"("groupKey");

-- CreateIndex
CREATE INDEX "AlertChannelDelivery_alertLogId_idx" ON "AlertChannelDelivery"("alertLogId");

-- CreateIndex
CREATE INDEX "AlertChannelDelivery_channel_idx" ON "AlertChannelDelivery"("channel");

-- CreateIndex
CREATE INDEX "AlertChannelDelivery_status_idx" ON "AlertChannelDelivery"("status");

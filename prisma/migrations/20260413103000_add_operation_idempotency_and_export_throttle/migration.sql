-- CreateTable
CREATE TABLE "OperationIdempotency" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "responseStatus" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationIdempotency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovementExportThrottleEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovementExportThrottleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationIdempotency_orgId_actorUserId_operation_idempotencyKey_key" ON "OperationIdempotency"("orgId", "actorUserId", "operation", "idempotencyKey");

-- CreateIndex
CREATE INDEX "OperationIdempotency_expiresAt_idx" ON "OperationIdempotency"("expiresAt");

-- CreateIndex
CREATE INDEX "OperationIdempotency_orgId_operation_createdAt_idx" ON "OperationIdempotency"("orgId", "operation", "createdAt");

-- CreateIndex
CREATE INDEX "MovementExportThrottleEvent_orgId_createdAt_idx" ON "MovementExportThrottleEvent"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "MovementExportThrottleEvent_orgId_userId_createdAt_idx" ON "MovementExportThrottleEvent"("orgId", "userId", "createdAt");

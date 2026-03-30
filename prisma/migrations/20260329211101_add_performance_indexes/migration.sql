-- CreateIndex
CREATE INDEX "CurrentStock_orgId_idx" ON "CurrentStock"("orgId");

-- CreateIndex
CREATE INDEX "Movement_orgId_createdAt_idx" ON "Movement"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Movement_orgId_locationId_createdAt_idx" ON "Movement"("orgId", "locationId", "createdAt");

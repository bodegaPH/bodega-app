-- Add explicit owner persistence for organizations
ALTER TABLE "Organization"
ADD COLUMN "ownerId" TEXT;

-- Rule 2: Prefer earliest ORG_ADMIN membership as owner when available
WITH earliest_admin AS (
  SELECT
    m."orgId",
    m."userId",
    ROW_NUMBER() OVER (
      PARTITION BY m."orgId"
      ORDER BY m."createdAt" ASC, m."id" ASC
    ) AS rn
  FROM "Membership" m
  WHERE m."role" = 'ORG_ADMIN'
)
UPDATE "Organization" o
SET "ownerId" = ea."userId"
FROM earliest_admin ea
WHERE o."id" = ea."orgId"
  AND ea.rn = 1
  AND o."ownerId" IS NULL;

-- Rule 3: Fallback to earliest membership, then promote that user to ORG_ADMIN
WITH earliest_member AS (
  SELECT
    m."orgId",
    m."userId",
    ROW_NUMBER() OVER (
      PARTITION BY m."orgId"
      ORDER BY m."createdAt" ASC, m."id" ASC
    ) AS rn
  FROM "Membership" m
)
UPDATE "Organization" o
SET "ownerId" = em."userId"
FROM earliest_member em
WHERE o."id" = em."orgId"
  AND em.rn = 1
  AND o."ownerId" IS NULL;

UPDATE "Membership" m
SET "role" = 'ORG_ADMIN'
FROM "Organization" o
WHERE o."id" = m."orgId"
  AND o."ownerId" = m."userId"
  AND m."role" <> 'ORG_ADMIN';

-- Rule 4: stop if any organization has no members (manual remediation required)
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM "Organization"
  WHERE "ownerId" IS NULL;

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Owner backfill failed: % organizations have no owner candidate (likely no memberships).', missing_count;
  END IF;
END $$;

ALTER TABLE "Organization"
ALTER COLUMN "ownerId" SET NOT NULL;

ALTER TABLE "Organization"
ADD CONSTRAINT "Organization_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Organization_ownerId_idx" ON "Organization"("ownerId");

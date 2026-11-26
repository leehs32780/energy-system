CREATE TABLE "ImportBatch" (
    "id" UUID NOT NULL,
    "meterId" UUID NOT NULL,
    "sha256" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validRows" INTEGER NOT NULL,
    "importedRows" INTEGER NOT NULL,
    "duplicateRows" INTEGER NOT NULL,
    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "MeterReading" ADD COLUMN "importBatchId" UUID;
CREATE INDEX "ImportBatch_meterId_receivedAt_idx" ON "ImportBatch"("meterId", "receivedAt");
ALTER TABLE "MeterReading" ADD CONSTRAINT "MeterReading_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

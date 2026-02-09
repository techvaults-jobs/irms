/*
  Warnings:

  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "AuditTrail_changeType_idx" ON "AuditTrail"("changeType");

-- CreateIndex
CREATE INDEX "AuditTrail_requisitionId_timestamp_idx" ON "AuditTrail"("requisitionId", "timestamp");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Requisition_updatedAt_idx" ON "Requisition"("updatedAt");

-- CreateIndex
CREATE INDEX "Requisition_category_idx" ON "Requisition"("category");

-- CreateIndex
CREATE INDEX "Requisition_urgencyLevel_idx" ON "Requisition"("urgencyLevel");

-- CreateIndex
CREATE INDEX "Requisition_paymentDate_idx" ON "Requisition"("paymentDate");

-- CreateIndex
CREATE INDEX "Requisition_status_createdAt_idx" ON "Requisition"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Requisition_departmentId_status_idx" ON "Requisition"("departmentId", "status");

-- CreateIndex
CREATE INDEX "Requisition_submitterId_status_idx" ON "Requisition"("submitterId", "status");

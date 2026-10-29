-- Payee details supplied by the requester, payment instructions set by the
-- final approver, and who recorded the payment.

ALTER TABLE "Requisition"
  ADD COLUMN "paidById" TEXT,
  ADD COLUMN "payeeType" TEXT,
  ADD COLUMN "payeeName" TEXT,
  ADD COLUMN "preferredPaymentMethod" TEXT,
  ADD COLUMN "payeeBankName" TEXT,
  ADD COLUMN "payeeAccountName" TEXT,
  ADD COLUMN "payeeAccountNumber" TEXT,
  ADD COLUMN "payeeBankCode" TEXT,
  ADD COLUMN "payeePhone" TEXT,
  ADD COLUMN "payeeEmail" TEXT,
  ADD COLUMN "payeeNotes" TEXT,
  ADD COLUMN "approvedPaymentMethod" TEXT,
  ADD COLUMN "paymentAssigneeId" TEXT,
  ADD COLUMN "paymentInstructions" TEXT,
  ADD COLUMN "paymentDueDate" TIMESTAMP(3),
  ADD COLUMN "paymentInstructedById" TEXT,
  ADD COLUMN "paymentInstructedAt" TIMESTAMP(3);

CREATE INDEX "Requisition_paymentAssigneeId_status_idx" ON "Requisition"("paymentAssigneeId", "status");

ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_paymentAssigneeId_fkey" FOREIGN KEY ("paymentAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_paymentInstructedById_fkey" FOREIGN KEY ("paymentInstructedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

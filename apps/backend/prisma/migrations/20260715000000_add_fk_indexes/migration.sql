-- CreateIndex
CREATE INDEX "attendances_studentId_idx" ON "attendances"("studentId");

-- CreateIndex
CREATE INDEX "attendances_recordedById_idx" ON "attendances"("recordedById");

-- CreateIndex
CREATE INDEX "commission_details_commissionId_idx" ON "commission_details"("commissionId");

-- CreateIndex
CREATE INDEX "commission_details_sessionLogId_idx" ON "commission_details"("sessionLogId");

-- CreateIndex
CREATE INDEX "commission_details_studentId_idx" ON "commission_details"("studentId");

-- CreateIndex
CREATE INDEX "commission_details_subjectId_idx" ON "commission_details"("subjectId");

-- CreateIndex
CREATE INDEX "commissions_teacherId_idx" ON "commissions"("teacherId");

-- CreateIndex
CREATE INDEX "commissions_approvedById_idx" ON "commissions"("approvedById");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "invoices_branchId_idx" ON "invoices"("branchId");

-- CreateIndex
CREATE INDEX "invoices_studentId_idx" ON "invoices"("studentId");

-- CreateIndex
CREATE INDEX "invoices_generatedById_idx" ON "invoices"("generatedById");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_branchId_idx" ON "payments"("branchId");

-- CreateIndex
CREATE INDEX "payments_recordedById_idx" ON "payments"("recordedById");

-- CreateIndex
CREATE INDEX "products_branchId_idx" ON "products"("branchId");

-- CreateIndex
CREATE INDEX "progress_logs_sessionLogId_idx" ON "progress_logs"("sessionLogId");

-- CreateIndex
CREATE INDEX "progress_logs_studentId_idx" ON "progress_logs"("studentId");

-- CreateIndex
CREATE INDEX "progress_logs_subjectId_idx" ON "progress_logs"("subjectId");

-- CreateIndex
CREATE INDEX "progress_logs_moduleId_idx" ON "progress_logs"("moduleId");

-- CreateIndex
CREATE INDEX "progress_logs_recordedById_idx" ON "progress_logs"("recordedById");

-- CreateIndex
CREATE INDEX "progress_report_links_studentId_idx" ON "progress_report_links"("studentId");

-- CreateIndex
CREATE INDEX "progress_report_links_branchId_idx" ON "progress_report_links"("branchId");

-- CreateIndex
CREATE INDEX "progress_report_links_generatedById_idx" ON "progress_report_links"("generatedById");

-- CreateIndex
CREATE INDEX "sale_items_saleId_idx" ON "sale_items"("saleId");

-- CreateIndex
CREATE INDEX "sale_items_productId_idx" ON "sale_items"("productId");

-- CreateIndex
CREATE INDEX "sales_branchId_idx" ON "sales"("branchId");

-- CreateIndex
CREATE INDEX "sales_studentId_idx" ON "sales"("studentId");

-- CreateIndex
CREATE INDEX "sales_createdById_idx" ON "sales"("createdById");

-- CreateIndex
CREATE INDEX "session_logs_scheduledTeacherId_idx" ON "session_logs"("scheduledTeacherId");

-- CreateIndex
CREATE INDEX "session_logs_actualTeacherId_idx" ON "session_logs"("actualTeacherId");

-- CreateIndex
CREATE INDEX "session_logs_adHocSubjectId_idx" ON "session_logs"("adHocSubjectId");

-- CreateIndex
CREATE INDEX "session_logs_reviewedById_idx" ON "session_logs"("reviewedById");

-- CreateIndex
CREATE INDEX "session_students_studentId_idx" ON "session_students"("studentId");

-- CreateIndex
CREATE INDEX "sessions_subjectId_idx" ON "sessions"("subjectId");

-- CreateIndex
CREATE INDEX "sessions_teacherId_idx" ON "sessions"("teacherId");

-- CreateIndex
CREATE INDEX "spp_rates_subjectId_idx" ON "spp_rates"("subjectId");

-- CreateIndex
CREATE INDEX "stock_mutations_productId_idx" ON "stock_mutations"("productId");

-- CreateIndex
CREATE INDEX "stock_mutations_branchId_idx" ON "stock_mutations"("branchId");

-- CreateIndex
CREATE INDEX "stock_mutations_createdById_idx" ON "stock_mutations"("createdById");

-- CreateIndex
CREATE INDEX "student_module_progress_moduleId_idx" ON "student_module_progress"("moduleId");

-- CreateIndex
CREATE INDEX "student_subjects_subjectId_idx" ON "student_subjects"("subjectId");

-- CreateIndex
CREATE INDEX "student_subjects_sppRateId_idx" ON "student_subjects"("sppRateId");

-- CreateIndex
CREATE INDEX "students_branchId_idx" ON "students"("branchId");

-- CreateIndex
CREATE INDEX "teacher_bonuses_branchId_idx" ON "teacher_bonuses"("branchId");

-- CreateIndex
CREATE INDEX "teacher_bonuses_teacherId_idx" ON "teacher_bonuses"("teacherId");

-- CreateIndex
CREATE INDEX "teacher_bonuses_approvedById_idx" ON "teacher_bonuses"("approvedById");

-- CreateIndex
CREATE INDEX "teacher_bonuses_createdById_idx" ON "teacher_bonuses"("createdById");

-- CreateIndex
CREATE INDEX "user_branches_branchId_idx" ON "user_branches"("branchId");


-- CreateIndex
CREATE INDEX "expenses_recordedById_idx" ON "expenses"("recordedById");

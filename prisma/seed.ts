import { PrismaClient, UserRole, ApplicationStatusEnum, DocumentType, ExtractionStatus, DiscrepancySeverity, RecommendationType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.applicationStatus.deleteMany();
  await prisma.analystReview.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.validationDiscrepancy.deleteMany();
  await prisma.extractionResult.deleteMany();
  await prisma.document.deleteMany();
  await prisma.application.deleteMany();
  await prisma.user.deleteMany();

  // Hash passwords
  const hashedPassword = await bcrypt.hash("password123", 10);

  // Create users
  const adminUser = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: "admin@dbs.com",
      name: "Admin User",
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  });

  const analystUser = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: "analyst@dbs.com",
      name: "Sarah Chen",
      password: hashedPassword,
      role: UserRole.ANALYST,
    },
  });

  const reviewerUser = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: "reviewer@dbs.com",
      name: "James Wong",
      password: hashedPassword,
      role: UserRole.REVIEWER,
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: "viewer@dbs.com",
      name: "Emily Tan",
      password: hashedPassword,
      role: UserRole.VIEWER,
    },
  });

  console.log("Created users:", {
    admin: adminUser.email,
    analyst: analystUser.email,
    reviewer: reviewerUser.email,
    viewer: viewerUser.email,
  });

  // Create sample applications
  const application1Id = uuidv4();
  const application1 = await prisma.application.create({
    data: {
      id: application1Id,
      applicationId: "DBS-1001",
      applicantName: "Sample User",
      loanType: "Personal Loan",
      loanAmount: 20000,
      status: ApplicationStatusEnum.ANALYST_REVIEW,
    },
  });

  const application2Id = uuidv4();
  const application2 = await prisma.application.create({
    data: {
      id: application2Id,
      applicationId: "DBS-1002",
      applicantName: "John Doe",
      loanType: "Home Loan",
      loanAmount: 500000,
      status: ApplicationStatusEnum.UNDER_REVIEW,
    },
  });

  const application3Id = uuidv4();
  const application3 = await prisma.application.create({
    data: {
      id: application3Id,
      applicationId: "DBS-1003",
      applicantName: "Jane Smith",
      loanType: "Business Loan",
      loanAmount: 150000,
      status: ApplicationStatusEnum.SUBMITTED,
    },
  });

  const application4Id = uuidv4();
  const application4 = await prisma.application.create({
    data: {
      id: application4Id,
      applicationId: "DBS-1004",
      applicantName: "Michael Lee",
      loanType: "Personal Loan",
      loanAmount: 35000,
      status: ApplicationStatusEnum.APPROVED,
    },
  });

  const application5Id = uuidv4();
  const application5 = await prisma.application.create({
    data: {
      id: application5Id,
      applicationId: "DBS-1005",
      applicantName: "Rachel Ng",
      loanType: "Home Loan",
      loanAmount: 750000,
      status: ApplicationStatusEnum.REJECTED,
    },
  });

  console.log("Created applications:", [
    application1.applicationId,
    application2.applicationId,
    application3.applicationId,
    application4.applicationId,
    application5.applicationId,
  ]);

  // Create documents for application 1 (DBS-1001)
  const doc1Id = uuidv4();
  const doc1 = await prisma.document.create({
    data: {
      id: doc1Id,
      applicationId: application1Id,
      type: DocumentType.INCOME_STATEMENT,
      fileName: "income_statement_2024.pdf",
      fileSize: 245000,
      storageUrl: "/uploads/dbs-1001/income_statement_2024.pdf",
      uploadedBy: analystUser.id,
    },
  });

  const doc2Id = uuidv4();
  const doc2 = await prisma.document.create({
    data: {
      id: doc2Id,
      applicationId: application1Id,
      type: DocumentType.BANK_STATEMENT,
      fileName: "bank_statement_q4_2024.pdf",
      fileSize: 512000,
      storageUrl: "/uploads/dbs-1001/bank_statement_q4_2024.pdf",
      uploadedBy: analystUser.id,
    },
  });

  const doc3Id = uuidv4();
  const doc3 = await prisma.document.create({
    data: {
      id: doc3Id,
      applicationId: application1Id,
      type: DocumentType.IDENTITY_DOCUMENT,
      fileName: "nric_front_back.pdf",
      fileSize: 180000,
      storageUrl: "/uploads/dbs-1001/nric_front_back.pdf",
      uploadedBy: analystUser.id,
    },
  });

  const doc4Id = uuidv4();
  const doc4 = await prisma.document.create({
    data: {
      id: doc4Id,
      applicationId: application1Id,
      type: DocumentType.TAX_RETURN,
      fileName: "tax_return_2023.pdf",
      fileSize: 320000,
      storageUrl: "/uploads/dbs-1001/tax_return_2023.pdf",
      uploadedBy: analystUser.id,
    },
  });

  // Create documents for application 2 (DBS-1002)
  const doc5Id = uuidv4();
  await prisma.document.create({
    data: {
      id: doc5Id,
      applicationId: application2Id,
      type: DocumentType.PROPERTY_VALUATION,
      fileName: "property_valuation_report.pdf",
      fileSize: 890000,
      storageUrl: "/uploads/dbs-1002/property_valuation_report.pdf",
      uploadedBy: analystUser.id,
    },
  });

  const doc6Id = uuidv4();
  await prisma.document.create({
    data: {
      id: doc6Id,
      applicationId: application2Id,
      type: DocumentType.EMPLOYMENT_LETTER,
      fileName: "employment_letter.pdf",
      fileSize: 125000,
      storageUrl: "/uploads/dbs-1002/employment_letter.pdf",
      uploadedBy: analystUser.id,
    },
  });

  console.log("Created documents for applications");

  // Create extraction results for application 1 documents
  await prisma.extractionResult.create({
    data: {
      id: uuidv4(),
      documentId: doc1Id,
      extractedData: {
        applicantName: "Sample User",
        annualIncome: 72000,
        monthlyIncome: 6000,
        employer: "Tech Solutions Pte Ltd",
        employmentDate: "2019-03-15",
        currency: "SGD",
      },
      confidence: 0.95,
      status: ExtractionStatus.COMPLETED,
      errors: null,
    },
  });

  await prisma.extractionResult.create({
    data: {
      id: uuidv4(),
      documentId: doc2Id,
      extractedData: {
        accountHolder: "Sample User",
        bankName: "DBS Bank",
        accountNumber: "XXXX-XXXX-4521",
        averageMonthlyBalance: 15200,
        totalDeposits: 18500,
        totalWithdrawals: 12300,
        statementPeriod: "October 2024 - December 2024",
        currency: "SGD",
      },
      confidence: 0.92,
      status: ExtractionStatus.COMPLETED,
      errors: null,
    },
  });

  await prisma.extractionResult.create({
    data: {
      id: uuidv4(),
      documentId: doc3Id,
      extractedData: {
        fullName: "Sample User",
        nricNumber: "SXXXX567A",
        dateOfBirth: "1990-05-20",
        address: "123 Orchard Road, #08-01, Singapore 238858",
        nationality: "Singaporean",
      },
      confidence: 0.98,
      status: ExtractionStatus.COMPLETED,
      errors: null,
    },
  });

  await prisma.extractionResult.create({
    data: {
      id: uuidv4(),
      documentId: doc4Id,
      extractedData: {
        taxpayerName: "Sample User",
        assessmentYear: "2023",
        totalIncome: 68000,
        taxableIncome: 54000,
        taxPaid: 3200,
        employer: "Tech Solutions Pte Ltd",
        currency: "SGD",
      },
      confidence: 0.91,
      status: ExtractionStatus.COMPLETED,
      errors: null,
    },
  });

  // Create extraction results for application 2 documents
  await prisma.extractionResult.create({
    data: {
      id: uuidv4(),
      documentId: doc5Id,
      extractedData: {
        propertyAddress: "456 Marina Bay Drive, #12-05, Singapore 018983",
        valuationAmount: 1200000,
        valuationDate: "2024-10-01",
        propertyType: "Condominium",
        floorArea: "95 sqm",
        currency: "SGD",
      },
      confidence: 0.89,
      status: ExtractionStatus.COMPLETED,
      errors: null,
    },
  });

  await prisma.extractionResult.create({
    data: {
      id: uuidv4(),
      documentId: doc6Id,
      extractedData: {
        employeeName: "John Doe",
        employer: "Global Finance Corp",
        position: "Senior Manager",
        annualSalary: 120000,
        employmentStartDate: "2017-06-01",
        employmentType: "Permanent",
        currency: "SGD",
      },
      confidence: 0.94,
      status: ExtractionStatus.COMPLETED,
      errors: null,
    },
  });

  console.log("Created extraction results");

  // Create validation discrepancies for application 1
  await prisma.validationDiscrepancy.create({
    data: {
      id: uuidv4(),
      applicationId: application1Id,
      field: "annualIncome",
      sourceDocument: "Income Statement",
      targetDocument: "Tax Return",
      sourceValue: "72000",
      targetValue: "68000",
      severity: DiscrepancySeverity.MEDIUM,
      resolved: false,
    },
  });

  await prisma.validationDiscrepancy.create({
    data: {
      id: uuidv4(),
      applicationId: application1Id,
      field: "monthlyIncome",
      sourceDocument: "Income Statement",
      targetDocument: "Bank Statement (Average Deposits)",
      sourceValue: "6000",
      targetValue: "6167",
      severity: DiscrepancySeverity.LOW,
      resolved: true,
    },
  });

  // Create validation discrepancy for application 2
  await prisma.validationDiscrepancy.create({
    data: {
      id: uuidv4(),
      applicationId: application2Id,
      field: "employerName",
      sourceDocument: "Employment Letter",
      targetDocument: "Bank Statement",
      sourceValue: "Global Finance Corp",
      targetValue: "Global Finance Corporation Pte Ltd",
      severity: DiscrepancySeverity.LOW,
      resolved: false,
    },
  });

  console.log("Created validation discrepancies");

  // Create recommendation for application 1
  await prisma.recommendation.create({
    data: {
      id: uuidv4(),
      applicationId: application1Id,
      recommendation: RecommendationType.REFER_TO_ANALYST,
      rationale:
        "Income discrepancy of SGD 4,000 detected between income statement and tax return. The annual income reported on the income statement (SGD 72,000) exceeds the tax return figure (SGD 68,000) by 5.9%. This variance exceeds the acceptable threshold and requires analyst review. All other document cross-validations passed within acceptable margins.",
      confidence: 0.82,
      createdBy: adminUser.id,
    },
  });

  // Create recommendation for application 4 (approved)
  await prisma.recommendation.create({
    data: {
      id: uuidv4(),
      applicationId: application4Id,
      recommendation: RecommendationType.APPROVE,
      rationale:
        "All document validations passed. Income verified across multiple sources with less than 2% variance. Debt-to-income ratio is within acceptable limits at 28%. Credit history is clean with no delinquencies.",
      confidence: 0.96,
      createdBy: adminUser.id,
    },
  });

  // Create recommendation for application 5 (rejected)
  await prisma.recommendation.create({
    data: {
      id: uuidv4(),
      applicationId: application5Id,
      recommendation: RecommendationType.REJECT,
      rationale:
        "Multiple critical discrepancies found. Declared income does not match bank statements. Debt-to-income ratio exceeds 60% threshold. Property valuation is significantly below the requested loan amount.",
      confidence: 0.91,
      createdBy: adminUser.id,
    },
  });

  console.log("Created recommendations");

  // Create analyst review for application 4
  await prisma.analystReview.create({
    data: {
      id: uuidv4(),
      applicationId: application4Id,
      comment:
        "All documents verified and cross-validated. Income is consistent across all sources. Applicant meets all eligibility criteria for the requested personal loan amount.",
      isOverride: false,
      overrideRecommendation: null,
      justification: null,
      reviewedBy: analystUser.id,
    },
  });

  // Create analyst review for application 5
  await prisma.analystReview.create({
    data: {
      id: uuidv4(),
      applicationId: application5Id,
      comment:
        "Confirmed AI recommendation. The income discrepancies are significant and the applicant's debt-to-income ratio is too high for the requested loan amount.",
      isOverride: false,
      overrideRecommendation: null,
      justification: null,
      reviewedBy: analystUser.id,
    },
  });

  console.log("Created analyst reviews");

  // Create application status history for application 1
  const app1Statuses: { status: ApplicationStatusEnum; previousStatus: ApplicationStatusEnum | null; comments: string }[] = [
    { status: ApplicationStatusEnum.DRAFT, previousStatus: null, comments: "Application created" },
    { status: ApplicationStatusEnum.SUBMITTED, previousStatus: ApplicationStatusEnum.DRAFT, comments: "Application submitted for processing" },
    { status: ApplicationStatusEnum.UNDER_REVIEW, previousStatus: ApplicationStatusEnum.SUBMITTED, comments: "Application picked up for review" },
    { status: ApplicationStatusEnum.EXTRACTION_IN_PROGRESS, previousStatus: ApplicationStatusEnum.UNDER_REVIEW, comments: "Document extraction started" },
    { status: ApplicationStatusEnum.EXTRACTION_COMPLETE, previousStatus: ApplicationStatusEnum.EXTRACTION_IN_PROGRESS, comments: "All documents extracted successfully" },
    { status: ApplicationStatusEnum.VALIDATION_IN_PROGRESS, previousStatus: ApplicationStatusEnum.EXTRACTION_COMPLETE, comments: "Cross-validation started" },
    { status: ApplicationStatusEnum.VALIDATION_COMPLETE, previousStatus: ApplicationStatusEnum.VALIDATION_IN_PROGRESS, comments: "Validation complete - discrepancies found" },
    { status: ApplicationStatusEnum.RECOMMENDATION_GENERATED, previousStatus: ApplicationStatusEnum.VALIDATION_COMPLETE, comments: "AI recommendation generated" },
    { status: ApplicationStatusEnum.ANALYST_REVIEW, previousStatus: ApplicationStatusEnum.RECOMMENDATION_GENERATED, comments: "Referred to analyst for review" },
  ];

  for (const statusEntry of app1Statuses) {
    await prisma.applicationStatus.create({
      data: {
        id: uuidv4(),
        applicationId: application1Id,
        status: statusEntry.status,
        previousStatus: statusEntry.previousStatus,
        changedBy: analystUser.id,
        comments: statusEntry.comments,
      },
    });
  }

  // Create application status history for application 4 (approved)
  const app4Statuses: { status: ApplicationStatusEnum; previousStatus: ApplicationStatusEnum | null; comments: string }[] = [
    { status: ApplicationStatusEnum.DRAFT, previousStatus: null, comments: "Application created" },
    { status: ApplicationStatusEnum.SUBMITTED, previousStatus: ApplicationStatusEnum.DRAFT, comments: "Application submitted" },
    { status: ApplicationStatusEnum.UNDER_REVIEW, previousStatus: ApplicationStatusEnum.SUBMITTED, comments: "Review started" },
    { status: ApplicationStatusEnum.EXTRACTION_COMPLETE, previousStatus: ApplicationStatusEnum.UNDER_REVIEW, comments: "Extraction completed" },
    { status: ApplicationStatusEnum.VALIDATION_COMPLETE, previousStatus: ApplicationStatusEnum.EXTRACTION_COMPLETE, comments: "Validation passed" },
    { status: ApplicationStatusEnum.RECOMMENDATION_GENERATED, previousStatus: ApplicationStatusEnum.VALIDATION_COMPLETE, comments: "Recommended for approval" },
    { status: ApplicationStatusEnum.ANALYST_REVIEW, previousStatus: ApplicationStatusEnum.RECOMMENDATION_GENERATED, comments: "Analyst review" },
    { status: ApplicationStatusEnum.APPROVED, previousStatus: ApplicationStatusEnum.ANALYST_REVIEW, comments: "Application approved" },
  ];

  for (const statusEntry of app4Statuses) {
    await prisma.applicationStatus.create({
      data: {
        id: uuidv4(),
        applicationId: application4Id,
        status: statusEntry.status,
        previousStatus: statusEntry.previousStatus,
        changedBy: analystUser.id,
        comments: statusEntry.comments,
      },
    });
  }

  console.log("Created application status history");

  // Create audit logs
  await prisma.auditLog.create({
    data: {
      id: uuidv4(),
      applicationId: application1Id,
      userId: analystUser.id,
      action: "DOCUMENT_UPLOAD",
      entityType: "Document",
      entityId: doc1Id,
      details: { fileName: "income_statement_2024.pdf", documentType: "INCOME_STATEMENT" },
      ipAddress: "192.168.1.100",
      outcome: "SUCCESS",
    },
  });

  await prisma.auditLog.create({
    data: {
      id: uuidv4(),
      applicationId: application1Id,
      userId: analystUser.id,
      action: "DOCUMENT_UPLOAD",
      entityType: "Document",
      entityId: doc2Id,
      details: { fileName: "bank_statement_q4_2024.pdf", documentType: "BANK_STATEMENT" },
      ipAddress: "192.168.1.100",
      outcome: "SUCCESS",
    },
  });

  await prisma.auditLog.create({
    data: {
      id: uuidv4(),
      applicationId: application1Id,
      userId: null,
      action: "EXTRACTION_COMPLETED",
      entityType: "ExtractionResult",
      entityId: application1Id,
      details: { documentsProcessed: 4, averageConfidence: 0.94 },
      ipAddress: null,
      outcome: "SUCCESS",
    },
  });

  await prisma.auditLog.create({
    data: {
      id: uuidv4(),
      applicationId: application1Id,
      userId: null,
      action: "VALIDATION_COMPLETED",
      entityType: "Application",
      entityId: application1Id,
      details: { discrepanciesFound: 2, criticalDiscrepancies: 0 },
      ipAddress: null,
      outcome: "SUCCESS",
    },
  });

  await prisma.auditLog.create({
    data: {
      id: uuidv4(),
      applicationId: application1Id,
      userId: adminUser.id,
      action: "RECOMMENDATION_GENERATED",
      entityType: "Recommendation",
      entityId: application1Id,
      details: { recommendation: "REFER_TO_ANALYST", confidence: 0.82 },
      ipAddress: null,
      outcome: "SUCCESS",
    },
  });

  await prisma.auditLog.create({
    data: {
      id: uuidv4(),
      applicationId: null,
      userId: analystUser.id,
      action: "USER_LOGIN",
      entityType: "User",
      entityId: analystUser.id,
      details: { method: "credentials" },
      ipAddress: "192.168.1.100",
      outcome: "SUCCESS",
    },
  });

  console.log("Created audit logs");

  console.log("Database seeding completed successfully!");
  console.log("\nTest Credentials:");
  console.log("  Admin:    admin@dbs.com    / password123");
  console.log("  Analyst:  analyst@dbs.com  / password123");
  console.log("  Reviewer: reviewer@dbs.com / password123");
  console.log("  Viewer:   viewer@dbs.com   / password123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
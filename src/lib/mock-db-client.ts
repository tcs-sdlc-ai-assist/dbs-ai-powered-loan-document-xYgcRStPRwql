import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

function cloneWithDates<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (Array.isArray(obj)) {
    return obj.map(item => cloneWithDates(item)) as any;
  }
  if (typeof obj === "object") {
    const copy: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = (obj as any)[key];
        if (val instanceof Date) {
          copy[key] = new Date(val.getTime());
        } else if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(val)) {
          copy[key] = new Date(val);
        } else {
          copy[key] = cloneWithDates(val);
        }
      }
    }
    return copy;
  }
  return obj;
}

function matchesWhere(item: any, where: any): boolean {
  if (!where) return true;
  for (const key in where) {
    if (key === "OR") {
      const orConditions: any[] = where.OR;
      if (!orConditions.some(cond => matchesWhere(item, cond))) {
        return false;
      }
      continue;
    }
    const condition = where[key];
    const value = item[key];
    if (condition && typeof condition === "object" && !(condition instanceof Date)) {
      if ("contains" in condition) {
        const searchStr = condition.contains;
        if (!value) return false;
        if (condition.mode === "insensitive") {
          if (!value.toLowerCase().includes(searchStr.toLowerCase())) {
            return false;
          }
        } else {
          if (!value.includes(searchStr)) return false;
        }
      } else {
        if ("gte" in condition) {
          if (!value || new Date(value) < new Date(condition.gte)) return false;
        }
        if ("lte" in condition) {
          if (!value || new Date(value) > new Date(condition.lte)) return false;
        }
      }
    } else {
      if (value instanceof Date && condition instanceof Date) {
        if (value.getTime() !== condition.getTime()) return false;
      } else if (value !== condition) {
        return false;
      }
    }
  }
  return true;
}

function sortItems(items: any[], orderBy: any) {
  if (!orderBy) return;
  const orderList = Array.isArray(orderBy) ? orderBy : [orderBy];
  items.sort((a, b) => {
    for (const order of orderList) {
      const key = Object.keys(order)[0];
      const direction = order[key];
      let valA = a[key];
      let valB = b[key];
      if (valA instanceof Date) valA = valA.getTime();
      if (valB instanceof Date) valB = valB.getTime();
      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
    }
    return 0;
  });
}

export function initializeMockDb() {
  const hashedPassword = bcrypt.hashSync("password123", 10);

  const adminUser = {
    id: uuidv4(),
    email: "admin@dbs.com",
    name: "Admin User",
    password: hashedPassword,
    role: "ADMIN",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const analystUser = {
    id: uuidv4(),
    email: "analyst@dbs.com",
    name: "Sarah Chen",
    password: hashedPassword,
    role: "ANALYST",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const reviewerUser = {
    id: uuidv4(),
    email: "reviewer@dbs.com",
    name: "James Wong",
    password: hashedPassword,
    role: "REVIEWER",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const viewerUser = {
    id: uuidv4(),
    email: "viewer@dbs.com",
    name: "Emily Tan",
    password: hashedPassword,
    role: "VIEWER",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const users = [adminUser, analystUser, reviewerUser, viewerUser];

  const application1Id = uuidv4();
  const application1 = {
    id: application1Id,
    applicationId: "DBS-1001",
    applicantName: "Sample User",
    loanType: "Personal Loan",
    loanAmount: 20000,
    status: "ANALYST_REVIEW",
    createdAt: new Date(Date.now() - 8 * 3600000),
    updatedAt: new Date(),
  };

  const application2Id = uuidv4();
  const application2 = {
    id: application2Id,
    applicationId: "DBS-1002",
    applicantName: "John Doe",
    loanType: "Home Loan",
    loanAmount: 500000,
    status: "UNDER_REVIEW",
    createdAt: new Date(Date.now() - 6 * 3600000),
    updatedAt: new Date(),
  };

  const application3Id = uuidv4();
  const application3 = {
    id: application3Id,
    applicationId: "DBS-1003",
    applicantName: "Jane Smith",
    loanType: "Business Loan",
    loanAmount: 150000,
    status: "SUBMITTED",
    createdAt: new Date(Date.now() - 4 * 3600000),
    updatedAt: new Date(),
  };

  const application4Id = uuidv4();
  const application4 = {
    id: application4Id,
    applicationId: "DBS-1004",
    applicantName: "Michael Lee",
    loanType: "Personal Loan",
    loanAmount: 35000,
    status: "APPROVED",
    createdAt: new Date(Date.now() - 10 * 3600000),
    updatedAt: new Date(),
  };

  const application5Id = uuidv4();
  const application5 = {
    id: application5Id,
    applicationId: "DBS-1005",
    applicantName: "Rachel Ng",
    loanType: "Home Loan",
    loanAmount: 750000,
    status: "REJECTED",
    createdAt: new Date(Date.now() - 12 * 3600000),
    updatedAt: new Date(),
  };

  const applications = [application1, application2, application3, application4, application5];

  const doc1Id = uuidv4();
  const doc1 = {
    id: doc1Id,
    applicationId: application1Id,
    type: "INCOME_STATEMENT",
    fileName: "income_statement_2024.pdf",
    fileSize: 245000,
    storageUrl: "/uploads/dbs-1001/income_statement_2024.pdf",
    uploadedBy: analystUser.id,
    createdAt: new Date(Date.now() - 7 * 3600000),
    updatedAt: new Date(),
  };

  const doc2Id = uuidv4();
  const doc2 = {
    id: doc2Id,
    applicationId: application1Id,
    type: "BANK_STATEMENT",
    fileName: "bank_statement_q4_2024.pdf",
    fileSize: 512000,
    storageUrl: "/uploads/dbs-1001/bank_statement_q4_2024.pdf",
    uploadedBy: analystUser.id,
    createdAt: new Date(Date.now() - 7 * 3600000 + 5 * 60000),
    updatedAt: new Date(),
  };

  const doc3Id = uuidv4();
  const doc3 = {
    id: doc3Id,
    applicationId: application1Id,
    type: "IDENTITY_DOCUMENT",
    fileName: "nric_front_back.pdf",
    fileSize: 180000,
    storageUrl: "/uploads/dbs-1001/nric_front_back.pdf",
    uploadedBy: analystUser.id,
    createdAt: new Date(Date.now() - 7 * 3600000 + 10 * 60000),
    updatedAt: new Date(),
  };

  const doc4Id = uuidv4();
  const doc4 = {
    id: doc4Id,
    applicationId: application1Id,
    type: "TAX_RETURN",
    fileName: "tax_return_2023.pdf",
    fileSize: 320000,
    storageUrl: "/uploads/dbs-1001/tax_return_2023.pdf",
    uploadedBy: analystUser.id,
    createdAt: new Date(Date.now() - 7 * 3600000 + 15 * 60000),
    updatedAt: new Date(),
  };

  const doc5Id = uuidv4();
  const doc5 = {
    id: doc5Id,
    applicationId: application2Id,
    type: "PROPERTY_VALUATION",
    fileName: "property_valuation_report.pdf",
    fileSize: 890000,
    storageUrl: "/uploads/dbs-1002/property_valuation_report.pdf",
    uploadedBy: analystUser.id,
    createdAt: new Date(Date.now() - 5 * 3600000),
    updatedAt: new Date(),
  };

  const doc6Id = uuidv4();
  const doc6 = {
    id: doc6Id,
    applicationId: application2Id,
    type: "EMPLOYMENT_LETTER",
    fileName: "employment_letter.pdf",
    fileSize: 125000,
    storageUrl: "/uploads/dbs-1002/employment_letter.pdf",
    uploadedBy: analystUser.id,
    createdAt: new Date(Date.now() - 5 * 3600000 + 5 * 60000),
    updatedAt: new Date(),
  };

  const documents = [doc1, doc2, doc3, doc4, doc5, doc6];

  const extractionResults = [
    {
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
      status: "COMPLETED",
      errors: null,
      createdAt: new Date(doc1.createdAt.getTime() + 10 * 1000),
      updatedAt: new Date(),
    },
    {
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
      status: "COMPLETED",
      errors: null,
      createdAt: new Date(doc2.createdAt.getTime() + 10 * 1000),
      updatedAt: new Date(),
    },
    {
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
      status: "COMPLETED",
      errors: null,
      createdAt: new Date(doc3.createdAt.getTime() + 10 * 1000),
      updatedAt: new Date(),
    },
    {
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
      status: "COMPLETED",
      errors: null,
      createdAt: new Date(doc4.createdAt.getTime() + 10 * 1000),
      updatedAt: new Date(),
    },
    {
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
      status: "COMPLETED",
      errors: null,
      createdAt: new Date(doc5.createdAt.getTime() + 10 * 1000),
      updatedAt: new Date(),
    },
    {
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
      status: "COMPLETED",
      errors: null,
      createdAt: new Date(doc6.createdAt.getTime() + 10 * 1000),
      updatedAt: new Date(),
    },
  ];

  const validationDiscrepancies = [
    {
      id: uuidv4(),
      applicationId: application1Id,
      field: "annualIncome",
      sourceDocument: "Income Statement",
      targetDocument: "Tax Return",
      sourceValue: "72000",
      targetValue: "68000",
      severity: "MEDIUM",
      resolved: false,
      createdAt: new Date(Date.now() - 6.5 * 3600000),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      applicationId: application1Id,
      field: "monthlyIncome",
      sourceDocument: "Income Statement",
      targetDocument: "Bank Statement (Average Deposits)",
      sourceValue: "6000",
      targetValue: "6167",
      severity: "LOW",
      resolved: true,
      createdAt: new Date(Date.now() - 6.5 * 3600000 + 5 * 60000),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      applicationId: application2Id,
      field: "employerName",
      sourceDocument: "Employment Letter",
      targetDocument: "Bank Statement",
      sourceValue: "Global Finance Corp",
      targetValue: "Global Finance Corporation Pte Ltd",
      severity: "LOW",
      resolved: false,
      createdAt: new Date(Date.now() - 4.5 * 3600000),
      updatedAt: new Date(),
    },
  ];

  const recommendations = [
    {
      id: uuidv4(),
      applicationId: application1Id,
      recommendation: "REFER_TO_ANALYST",
      rationale:
        "Income discrepancy of SGD 4,000 detected between income statement and tax return. The annual income reported on the income statement (SGD 72,000) exceeds the tax return figure (SGD 68,000) by 5.9%. This variance exceeds the acceptable threshold and requires analyst review. All other document cross-validations passed within acceptable margins.",
      confidence: 0.82,
      createdBy: adminUser.id,
      createdAt: new Date(Date.now() - 6 * 3600000),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      applicationId: application4Id,
      recommendation: "APPROVE",
      rationale:
        "All document validations passed. Income verified across multiple sources with less than 2% variance. Debt-to-income ratio is within acceptable limits at 28%. Credit history is clean with no delinquencies.",
      confidence: 0.96,
      createdBy: adminUser.id,
      createdAt: new Date(Date.now() - 9 * 3600000),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      applicationId: application5Id,
      recommendation: "REJECT",
      rationale:
        "Multiple critical discrepancies found. Declared income does not match bank statements. Debt-to-income ratio exceeds 60% threshold. Property valuation is significantly below the requested loan amount.",
      confidence: 0.91,
      createdBy: adminUser.id,
      createdAt: new Date(Date.now() - 11 * 3600000),
      updatedAt: new Date(),
    },
  ];

  const analystReviews = [
    {
      id: uuidv4(),
      applicationId: application4Id,
      comment:
        "All documents verified and cross-validated. Income is consistent across all sources. Applicant meets all eligibility criteria for the requested personal loan amount.",
      isOverride: false,
      overrideRecommendation: null,
      justification: null,
      reviewedBy: analystUser.id,
      createdAt: new Date(Date.now() - 8.5 * 3600000),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      applicationId: application5Id,
      comment:
        "Confirmed AI recommendation. The income discrepancies are significant and the applicant's debt-to-income ratio is too high for the requested loan amount.",
      isOverride: false,
      overrideRecommendation: null,
      justification: null,
      reviewedBy: analystUser.id,
      createdAt: new Date(Date.now() - 10.5 * 3600000),
      updatedAt: new Date(),
    },
  ];

  const applicationStatuses: any[] = [];

  const app1Statuses = [
    { status: "DRAFT", previousStatus: null, comments: "Application created", timeOffset: -8 * 3600000 },
    { status: "SUBMITTED", previousStatus: "DRAFT", comments: "Application submitted for processing", timeOffset: -7.8 * 3600000 },
    { status: "UNDER_REVIEW", previousStatus: "SUBMITTED", comments: "Application picked up for review", timeOffset: -7.5 * 3600000 },
    { status: "EXTRACTION_IN_PROGRESS", previousStatus: "UNDER_REVIEW", comments: "Document extraction started", timeOffset: -7.4 * 3600000 },
    { status: "EXTRACTION_COMPLETE", previousStatus: "EXTRACTION_IN_PROGRESS", comments: "All documents extracted successfully", timeOffset: -7.2 * 3600000 },
    { status: "VALIDATION_IN_PROGRESS", previousStatus: "EXTRACTION_COMPLETE", comments: "Cross-validation started", timeOffset: -7.0 * 3600000 },
    { status: "VALIDATION_COMPLETE", previousStatus: "VALIDATION_IN_PROGRESS", comments: "Validation complete - discrepancies found", timeOffset: -6.8 * 3600000 },
    { status: "RECOMMENDATION_GENERATED", previousStatus: "VALIDATION_COMPLETE", comments: "AI recommendation generated", timeOffset: -6.6 * 3600000 },
    { status: "ANALYST_REVIEW", previousStatus: "RECOMMENDATION_GENERATED", comments: "Referred to analyst for review", timeOffset: -6.4 * 3600000 },
  ];

  for (const s of app1Statuses) {
    applicationStatuses.push({
      id: uuidv4(),
      applicationId: application1Id,
      status: s.status,
      previousStatus: s.previousStatus,
      changedBy: analystUser.id,
      comments: s.comments,
      createdAt: new Date(Date.now() + s.timeOffset),
      updatedAt: new Date(),
    });
  }

  const app4Statuses = [
    { status: "DRAFT", previousStatus: null, comments: "Application created", timeOffset: -10 * 3600000 },
    { status: "SUBMITTED", previousStatus: "DRAFT", comments: "Application submitted", timeOffset: -9.8 * 3600000 },
    { status: "UNDER_REVIEW", previousStatus: "SUBMITTED", comments: "Review started", timeOffset: -9.5 * 3600000 },
    { status: "EXTRACTION_COMPLETE", previousStatus: "UNDER_REVIEW", comments: "Extraction completed", timeOffset: -9.4 * 3600000 },
    { status: "VALIDATION_COMPLETE", previousStatus: "EXTRACTION_COMPLETE", comments: "Validation passed", timeOffset: -9.2 * 3600000 },
    { status: "RECOMMENDATION_GENERATED", previousStatus: "VALIDATION_COMPLETE", comments: "Recommended for approval", timeOffset: -9.0 * 3600000 },
    { status: "ANALYST_REVIEW", previousStatus: "RECOMMENDATION_GENERATED", comments: "Analyst review", timeOffset: -8.8 * 3600000 },
    { status: "APPROVED", previousStatus: "ANALYST_REVIEW", comments: "Application approved", timeOffset: -8.5 * 3600000 },
  ];

  for (const s of app4Statuses) {
    applicationStatuses.push({
      id: uuidv4(),
      applicationId: application4Id,
      status: s.status,
      previousStatus: s.previousStatus,
      changedBy: analystUser.id,
      comments: s.comments,
      createdAt: new Date(Date.now() + s.timeOffset),
      updatedAt: new Date(),
    });
  }

  const auditLogs = [
    {
      id: uuidv4(),
      applicationId: application1Id,
      userId: analystUser.id,
      action: "DOCUMENT_UPLOAD",
      entityType: "Document",
      entityId: doc1Id,
      details: { fileName: "income_statement_2024.pdf", documentType: "INCOME_STATEMENT" },
      ipAddress: "192.168.1.100",
      outcome: "SUCCESS",
      createdAt: new Date(Date.now() - 7.9 * 3600000),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      applicationId: application1Id,
      userId: analystUser.id,
      action: "DOCUMENT_UPLOAD",
      entityType: "Document",
      entityId: doc2Id,
      details: { fileName: "bank_statement_q4_2024.pdf", documentType: "BANK_STATEMENT" },
      ipAddress: "192.168.1.100",
      outcome: "SUCCESS",
      createdAt: new Date(Date.now() - 7.8 * 3600000),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      applicationId: application1Id,
      userId: null,
      action: "EXTRACTION_COMPLETED",
      entityType: "ExtractionResult",
      entityId: application1Id,
      details: { documentsProcessed: 4, averageConfidence: 0.94 },
      ipAddress: null,
      outcome: "SUCCESS",
      createdAt: new Date(Date.now() - 7.1 * 3600000),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      applicationId: application1Id,
      userId: null,
      action: "VALIDATION_COMPLETED",
      entityType: "Application",
      entityId: application1Id,
      details: { discrepanciesFound: 2, criticalDiscrepancies: 0 },
      ipAddress: null,
      outcome: "SUCCESS",
      createdAt: new Date(Date.now() - 6.7 * 3600000),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      applicationId: application1Id,
      userId: adminUser.id,
      action: "RECOMMENDATION_GENERATED",
      entityType: "Recommendation",
      entityId: application1Id,
      details: { recommendation: "REFER_TO_ANALYST", confidence: 0.82 },
      ipAddress: null,
      outcome: "SUCCESS",
      createdAt: new Date(Date.now() - 6.1 * 3600000),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      applicationId: null,
      userId: analystUser.id,
      action: "USER_LOGIN",
      entityType: "User",
      entityId: analystUser.id,
      details: { method: "credentials" },
      ipAddress: "192.168.1.100",
      outcome: "SUCCESS",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  return {
    user: users,
    application: applications,
    document: documents,
    extractionResult: extractionResults,
    validationDiscrepancy: validationDiscrepancies,
    recommendation: recommendations,
    analystReview: analystReviews,
    applicationStatus: applicationStatuses,
    auditLog: auditLogs,
  };
}

export class MockModel {
  constructor(public modelName: string, public client: MockDbClient) {}

  private getTable(): any[] {
    return this.client.getTables()[this.modelName];
  }

  async findUnique(args: any) {
    const table = this.getTable();
    const item = table.find(x => matchesWhere(x, args.where));
    if (!item) return null;
    
    const cloned = cloneWithDates(item);
    if (args.include) {
      this.populateRelations(cloned, args.include);
    }
    return cloned;
  }

  async findFirst(args: any = {}) {
    const table = this.getTable();
    const item = table.find(x => matchesWhere(x, args.where));
    if (!item) return null;
    
    const cloned = cloneWithDates(item);
    if (args.include) {
      this.populateRelations(cloned, args.include);
    }
    return cloned;
  }

  async findMany(args: any = {}) {
    const table = this.getTable();
    let filtered = table.filter(x => matchesWhere(x, args.where));
    
    if (args.orderBy) {
      sortItems(filtered, args.orderBy);
    }

    if (args.skip !== undefined) {
      filtered = filtered.slice(args.skip);
    }

    if (args.take !== undefined) {
      filtered = filtered.slice(0, args.take);
    }

    const cloned = cloneWithDates(filtered);
    if (args.include) {
      cloned.forEach((item: any) => this.populateRelations(item, args.include));
    }
    return cloned;
  }

  async create(args: any) {
    const allTables = this.client.getTables();
    const table = allTables[this.modelName];
    const data = { ...args.data };
    if (!data.id) {
      data.id = uuidv4();
    }
    if (!data.createdAt) {
      data.createdAt = new Date();
    }
    if (!data.updatedAt) {
      data.updatedAt = new Date();
    }

    table.push(data);
    this.client.saveTables(allTables);

    const cloned = cloneWithDates(data);
    if (args.include) {
      this.populateRelations(cloned, args.include);
    }
    return cloned;
  }

  async update(args: any) {
    const allTables = this.client.getTables();
    const table = allTables[this.modelName];
    const item = table.find(x => matchesWhere(x, args.where));
    if (!item) {
      throw new Error(`Record not found for update in model ${this.modelName}`);
    }

    const data = args.data;
    for (const key in data) {
      if (data[key] && typeof data[key] === "object" && !(data[key] instanceof Date)) {
        if ("set" in data[key]) {
          item[key] = data[key].set;
        } else {
          item[key] = data[key];
        }
      } else {
        item[key] = data[key];
      }
    }
    item.updatedAt = new Date();
    this.client.saveTables(allTables);

    const cloned = cloneWithDates(item);
    if (args.include) {
      this.populateRelations(cloned, args.include);
    }
    return cloned;
  }

  async delete(args: any) {
    const allTables = this.client.getTables();
    const table = allTables[this.modelName];
    const index = table.findIndex(x => matchesWhere(x, args.where));
    if (index === -1) {
      throw new Error(`Record not found for delete in model ${this.modelName}`);
    }
    const item = table.splice(index, 1)[0];
    this.client.saveTables(allTables);
    return cloneWithDates(item);
  }

  async count(args: any = {}) {
    const table = this.getTable();
    const filtered = table.filter(x => matchesWhere(x, args.where));
    return filtered.length;
  }

  async deleteMany(args: any = {}) {
    const allTables = this.client.getTables();
    const table = allTables[this.modelName];
    if (!args.where || Object.keys(args.where).length === 0) {
      const len = table.length;
      allTables[this.modelName] = [];
      this.client.saveTables(allTables);
      return { count: len };
    }
    let deleteCount = 0;
    const remaining = table.filter(x => {
      if (matchesWhere(x, args.where)) {
        deleteCount++;
        return false;
      }
      return true;
    });
    allTables[this.modelName] = remaining;
    this.client.saveTables(allTables);
    return { count: deleteCount };
  }

  async groupBy(args: any) {
    const table = this.getTable();
    const filtered = table.filter(x => matchesWhere(x, args.where));
    const groupField = args.by[0];
    
    const groups: Record<string, any[]> = {};
    for (const item of filtered) {
      const key = item[groupField] || "";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }

    const result = Object.entries(groups).map(([val, items]) => {
      const res: any = {
        [groupField]: val,
      };
      if (args._count) {
        res._count = {
          [Object.keys(args._count)[0]]: items.length
        };
      }
      return res;
    });
    return result;
  }

  private populateRelations(item: any, include: any) {
    if (!include) return;

    const tables = this.client.getTables();

    if (this.modelName === "application") {
      if (include.documents) {
        const docTable = tables["document"];
        const docs = docTable.filter(d => d.applicationId === item.id);
        const subInclude = include.documents.include;
        const clonedDocs = cloneWithDates(docs);
        if (subInclude) {
          clonedDocs.forEach(d => {
            if (subInclude.extractionResult) {
              const extTable = tables["extractionResult"];
              const ext = extTable.find(e => e.documentId === d.id);
              d.extractionResult = ext ? cloneWithDates(ext) : null;
            }
          });
        }
        if (include.documents.orderBy) {
          sortItems(clonedDocs, include.documents.orderBy);
        }
        item.documents = clonedDocs;
      }

      if (include.validationDiscrepancies) {
        const discTable = tables["validationDiscrepancy"];
        const discrepancies = discTable.filter(d => d.applicationId === item.id);
        const clonedDisc = cloneWithDates(discrepancies);
        if (include.validationDiscrepancies.orderBy) {
          sortItems(clonedDisc, include.validationDiscrepancies.orderBy);
        }
        item.validationDiscrepancies = clonedDisc;
      }

      if (include.recommendations) {
        const recTable = tables["recommendation"];
        const recommendations = recTable.filter(r => r.applicationId === item.id);
        const clonedRec = cloneWithDates(recommendations);
        const subInclude = include.recommendations.include;
        if (subInclude?.user) {
          clonedRec.forEach(r => {
            const userTable = tables["user"];
            const user = userTable.find(u => u.id === r.createdBy);
            r.user = user ? { id: user.id, name: user.name, email: user.email } : null;
          });
        }
        if (include.recommendations.orderBy) {
          sortItems(clonedRec, include.recommendations.orderBy);
        }
        item.recommendations = clonedRec;
      }

      if (include.analystReviews) {
        const revTable = tables["analystReview"];
        const reviews = revTable.filter(r => r.applicationId === item.id);
        const clonedRev = cloneWithDates(reviews);
        const subInclude = include.analystReviews.include;
        if (subInclude?.reviewer) {
          clonedRev.forEach(r => {
            const userTable = tables["user"];
            const user = userTable.find(u => u.id === r.reviewedBy);
            r.reviewer = user ? { id: user.id, name: user.name, email: user.email } : null;
          });
        }
        if (include.analystReviews.orderBy) {
          sortItems(clonedRev, include.analystReviews.orderBy);
        }
        item.analystReviews = clonedRev;
      }

      if (include.applicationStatusHistory) {
        const statusTable = tables["applicationStatus"];
        const statuses = statusTable.filter(s => s.applicationId === item.id);
        const clonedStatuses = cloneWithDates(statuses);
        if (include.applicationStatusHistory.orderBy) {
          sortItems(clonedStatuses, include.applicationStatusHistory.orderBy);
        }
        item.applicationStatusHistory = clonedStatuses;
      }
    }

    if (this.modelName === "document") {
      if (include.extractionResult) {
        const extTable = tables["extractionResult"];
        const ext = extTable.find(e => e.documentId === item.id);
        item.extractionResult = ext ? cloneWithDates(ext) : null;
      }
    }

    if (this.modelName === "auditLog") {
      if (include.user) {
        const userTable = tables["user"];
        const user = userTable.find(u => u.id === item.userId);
        item.user = user ? { id: user.id, name: user.name, email: user.email } : null;
      }
    }

    if (this.modelName === "recommendation") {
      if (include.user) {
        const userTable = tables["user"];
        const user = userTable.find(u => u.id === item.createdBy);
        item.user = user ? { id: user.id, name: user.name, email: user.email } : null;
      }
      if (include.application) {
        const appTable = tables["application"];
        const app = appTable.find(a => a.id === item.applicationId);
        item.application = app ? cloneWithDates(app) : null;
      }
    }

    if (this.modelName === "analystReview") {
      if (include.reviewer) {
        const userTable = tables["user"];
        const user = userTable.find(u => u.id === item.reviewedBy);
        item.reviewer = user ? { id: user.id, name: user.name, email: user.email } : null;
      }
      if (include.application) {
        const appTable = tables["application"];
        const app = appTable.find(a => a.id === item.applicationId);
        item.application = app ? cloneWithDates(app) : null;
      }
    }
  }
}


// Delta shape stored in cookie — only user-created/modified/deleted records
// Format: { upserted: { [model]: { [id]: record } }, deleted: { [model]: string[] } }
// This is intentionally small to stay within the 4 KB browser cookie limit.
type MockDbDelta = {
  upserted: Record<string, Record<string, any>>;
  deleted: Record<string, string[]>;
};

function getCookiesFn(): any | null {
  try {
    return require("next/headers").cookies;
  } catch {
    return null;
  }
}

function readDeltaFromCookie(): MockDbDelta | null {
  try {
    const cookiesFn = getCookiesFn();
    if (!cookiesFn) return null;
    const cookieStore = cookiesFn();
    const cookie = cookieStore.get("mock_db_delta");
    if (cookie && cookie.value) {
      return JSON.parse(cookie.value) as MockDbDelta;
    }
  } catch {
    // Ignore
  }
  return null;
}

function writeDeltaToCookie(delta: MockDbDelta): void {
  try {
    const cookiesFn = getCookiesFn();
    if (!cookiesFn) return;
    const cookieStore = cookiesFn();
    cookieStore.set("mock_db_delta", JSON.stringify(delta), {
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  } catch {
    // Ignore
  }
}

function mergeDeltaIntoSeed(
  seed: Record<string, any[]>,
  delta: MockDbDelta
): Record<string, any[]> {
  const result: Record<string, any[]> = {};

  for (const model of Object.keys(seed)) {
    const deletedIds = new Set((delta.deleted[model] ?? []));
    const upsertedMap = delta.upserted[model] ?? {};

    // Start from seed, apply updates, skip deletions
    const merged = seed[model]
      .filter((rec: any) => !deletedIds.has(rec.id))
      .map((rec: any) =>
        upsertedMap[rec.id] ? cloneWithDates(upsertedMap[rec.id]) : cloneWithDates(rec)
      );

    // Append new records (those in upserted but not in seed)
    const seedIds = new Set(seed[model].map((r: any) => r.id));
    for (const [id, rec] of Object.entries(upsertedMap)) {
      if (!seedIds.has(id)) {
        merged.push(cloneWithDates(rec));
      }
    }

    result[model] = merged;
  }

  return result;
}

export class MockDbClient {
  user = new MockModel("user", this);
  application = new MockModel("application", this);
  document = new MockModel("document", this);
  extractionResult = new MockModel("extractionResult", this);
  validationDiscrepancy = new MockModel("validationDiscrepancy", this);
  recommendation = new MockModel("recommendation", this);
  analystReview = new MockModel("analystReview", this);
  applicationStatus = new MockModel("applicationStatus", this);
  auditLog = new MockModel("auditLog", this);

  // Static seed data (never mutated)
  private seedTables: Record<string, any[]>;

  // In-memory working copy (full merged state for this request)
  localInMemoryTables: Record<string, any[]> | null = null;

  // In-memory delta for this request (accumulated mutations)
  private localDelta: MockDbDelta = { upserted: {}, deleted: {} };

  // Expose seed for legacy compat (read-only)
  get tables(): Record<string, any[]> {
    return this.seedTables;
  }

  constructor() {
    this.seedTables = initializeMockDb();
  }

  getTables(): Record<string, any[]> {
    // 1. Try cookie delta (server-side requests)
    const cookieDelta = readDeltaFromCookie();
    if (cookieDelta) {
      return mergeDeltaIntoSeed(this.seedTables, cookieDelta);
    }

    // 2. Use in-memory working copy (already has local delta merged)
    if (!this.localInMemoryTables) {
      this.localInMemoryTables = mergeDeltaIntoSeed(this.seedTables, this.localDelta);
    }
    return this.localInMemoryTables;
  }

  saveTables(tables: Record<string, any[]>): void {
    // Rebuild the delta by diffing `tables` against seed
    const newDelta: MockDbDelta = { upserted: {}, deleted: {} };

    for (const model of Object.keys(this.seedTables)) {
      const seedMap: Record<string, any> = {};
      for (const rec of this.seedTables[model]) {
        seedMap[rec.id] = rec;
      }

      const currentMap: Record<string, any> = {};
      for (const rec of (tables[model] ?? [])) {
        currentMap[rec.id] = rec;
      }

      // Detect upserted (new or modified)
      for (const [id, rec] of Object.entries(currentMap)) {
        const seedRec = seedMap[id];
        if (!seedRec) {
          // New record not in seed
          if (!newDelta.upserted[model]) newDelta.upserted[model] = {};
          newDelta.upserted[model][id] = rec;
        } else {
          // Modified — compare updatedAt as a fast proxy
          const seedTs = seedRec.updatedAt instanceof Date
            ? seedRec.updatedAt.getTime()
            : new Date(seedRec.updatedAt).getTime();
          const recTs = rec.updatedAt instanceof Date
            ? rec.updatedAt.getTime()
            : new Date(rec.updatedAt).getTime();
          if (recTs > seedTs) {
            if (!newDelta.upserted[model]) newDelta.upserted[model] = {};
            newDelta.upserted[model][id] = rec;
          }
        }
      }

      // Detect deleted (in seed but not in current)
      for (const id of Object.keys(seedMap)) {
        if (!currentMap[id]) {
          if (!newDelta.deleted[model]) newDelta.deleted[model] = [];
          newDelta.deleted[model].push(id);
        }
      }
    }

    this.localDelta = newDelta;
    this.localInMemoryTables = tables;

    writeDeltaToCookie(newDelta);
  }

  async $transaction(arg: any) {
    if (typeof arg === "function") {
      return arg(this);
    }
    return Promise.all(arg);
  }

  async $queryRaw(strings: TemplateStringsArray, ...values: any[]) {
    return [1];
  }
}

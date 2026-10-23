export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AnomalyCategory = 
  | 'EXACT_DUPLICATE'
  | 'POTENTIAL_DUPLICATE'
  | 'AMOUNT_MISMATCH'
  | 'AMOUNT_OUTLIER'
  | 'FUTURE_DATE'
  | 'DATA_QUALITY';

export type ReviewStatus = 'PENDING' | 'NEEDS_REVIEW' | 'RESOLVED' | 'DISMISSED';

export interface RawInvoiceRow {
  [key: string]: string | number | undefined;
}

export interface Invoice {
  id: string; // Internal unique tracking ID
  invoice_id: string; // The invoice number from document
  vendor: string;
  invoice_date: string; // ISO YYYY-MM-DD
  amount: number;
  currency: string;
  category?: string;
  po_number?: string;
  expected_amount?: number;
  due_date?: string;
  notes?: string;
}

export interface RiskFinding {
  id: string;
  category: AnomalyCategory;
  severity: RiskLevel;
  scoreImpact: number; // 0-100 contribution
  title: string;
  description: string;
  evidence: string[];
  relatedInvoiceIds?: string[];
  fieldAffected?: string;
  isDataQualityOnly?: boolean; // If true, reflects formatting/metadata gap, NOT suspicious fraud
}

export interface InvoiceAnalysis {
  invoice: Invoice;
  overallScore: number; // 0 (pristine) to 100 (critical risk)
  riskLevel: RiskLevel;
  findings: RiskFinding[];
  flagged: boolean;
  reviewStatus: ReviewStatus;
  reviewNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  aiExplanation?: GeminiExplanation;
  aiLoading?: boolean;
  aiError?: string;
}

export interface GeminiExplanation {
  summary: string;
  evidence: string[];
  possible_explanations: string[];
  recommended_action: string;
  needs_human_review: boolean;
  limitations: string[];
  generated_at?: string;
  model_used?: string;
}

export interface BatchAuditMetrics {
  totalInvoices: number;
  totalAnalyzedValue: number;
  flaggedCount: number;
  highRiskCount: number; // HIGH or CRITICAL
  flaggedAmount: number; // Total value of invoices with any flagged findings (not assumed 'saved')
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  categoryBreakdown: Record<AnomalyCategory, number>;
  dataQualityIssuesCount: number;
  auditRunAt: string;
  executionDurationMs: number;
}

export interface ParseResult {
  invoices: Invoice[];
  errors: string[];
  warnings: string[];
  totalRowsRead: number;
  validRowsCount: number;
}

export interface EngineConfig {
  maxDaysNearDuplicate: number; // default 30 days
  similarityThreshold: number; // default 0.8
  outlierZScoreThreshold: number; // default 2.5 (MAD multiplier)
  minimumOutlierBaseline: number; // default 5 items
  referenceDate?: string; // Reference date for future-date check (default: current system date)
}

export interface GroundTruthLabel {
  invoice_id: string;
  isAnomaly: boolean;
  expectedCategories?: AnomalyCategory[];
  description: string;
}

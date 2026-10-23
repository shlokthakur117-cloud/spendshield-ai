import {
  Invoice,
  InvoiceAnalysis,
  RiskFinding,
  RiskLevel,
  AnomalyCategory,
  EngineConfig,
  BatchAuditMetrics,
} from '@/types/invoice';

export const DEFAULT_CONFIG: EngineConfig = {
  maxDaysNearDuplicate: 30,
  similarityThreshold: 0.8,
  outlierZScoreThreshold: 2.5,
  minimumOutlierBaseline: 5,
};

export function normalizeVendorName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(inc|corp|corporation|llc|ltd|gmbh|co|company|services|technologies|group)$/g, '');
}

export function normalizeInvoiceId(id: string): string {
  if (!id) return '';
  return id.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Levenshtein distance similarity (0.0 to 1.0)
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeInvoiceId(str1);
  const s2 = normalizeInvoiceId(str2);
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 1.0;

  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  return Math.max(0, 1.0 - distance / maxLen);
}

// Helper to compute median of numeric array
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

// Robust Median Absolute Deviation (MAD)
function calculateMad(values: number[], median: number): number {
  const deviations = values.map(v => Math.abs(v - median));
  return calculateMedian(deviations);
}

function daysBetween(date1: string, date2: string): number | null {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  if (isNaN(d1) || isNaN(d2)) return null;
  return Math.abs(Math.round((d1 - d2) / (1000 * 60 * 60 * 24)));
}

export function runAuditDetection(
  invoices: Invoice[],
  customConfig?: Partial<EngineConfig>
): {
  analyses: InvoiceAnalysis[];
  metrics: BatchAuditMetrics;
} {
  const startTime = performance.now();
  const config: EngineConfig = { ...DEFAULT_CONFIG, ...customConfig };
  const refDateStr = config.referenceDate || new Date().toISOString().split('T')[0];
  const refTimestamp = new Date(refDateStr + 'T23:59:59Z').getTime();

  // Pre-group invoices by vendor and category for baselines
  const vendorMap = new Map<string, Invoice[]>();
  const categoryMap = new Map<string, Invoice[]>();

  invoices.forEach(inv => {
    const normVendor = normalizeVendorName(inv.vendor);
    if (!vendorMap.has(normVendor)) {
      vendorMap.set(normVendor, []);
    }
    vendorMap.get(normVendor)!.push(inv);

    const cat = inv.category || 'Uncategorized';
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, []);
    }
    categoryMap.get(cat)!.push(inv);
  });

  // Calculate baseline metrics per vendor (for MAD outlier detection)
  const vendorBaselines = new Map<string, { median: number; mad: number; count: number }>();
  vendorMap.forEach((vendorInvoices, normVendor) => {
    if (vendorInvoices.length >= config.minimumOutlierBaseline) {
      const amounts = vendorInvoices.map(i => i.amount);
      const median = calculateMedian(amounts);
      const mad = calculateMad(amounts, median);
      vendorBaselines.set(normVendor, { median, mad, count: amounts.length });
    }
  });

  const analyses: InvoiceAnalysis[] = [];
  const categoryBreakdown: Record<AnomalyCategory, number> = {
    EXACT_DUPLICATE: 0,
    POTENTIAL_DUPLICATE: 0,
    AMOUNT_MISMATCH: 0,
    AMOUNT_OUTLIER: 0,
    FUTURE_DATE: 0,
    DATA_QUALITY: 0,
  };

  let totalAnalyzedValue = 0;
  let flaggedAmount = 0;
  let flaggedCount = 0;
  let highRiskCount = 0;
  let dataQualityIssuesCount = 0;

  for (let i = 0; i < invoices.length; i++) {
    const current = invoices[i];
    totalAnalyzedValue += current.amount;
    const findings: RiskFinding[] = [];
    const normVendor = normalizeVendorName(current.vendor);
    const normInvoiceId = normalizeInvoiceId(current.invoice_id);

    // ----------------------------------------------------
    // RULE A: Exact Duplicate Detection
    // ----------------------------------------------------
    const exactMatches: Invoice[] = [];
    for (let j = 0; j < invoices.length; j++) {
      if (i === j) continue;
      const other = invoices[j];
      const otherNormVendor = normalizeVendorName(other.vendor);
      const otherNormId = normalizeInvoiceId(other.invoice_id);

      // Same normalized vendor AND same normalized invoice number
      if (normVendor === otherNormVendor && normInvoiceId === otherNormId) {
        exactMatches.push(other);
      }
    }

    if (exactMatches.length > 0) {
      const matchIds = exactMatches.map(m => m.invoice_id);
      findings.push({
        id: `finding-exact-dup-${current.id}`,
        category: 'EXACT_DUPLICATE',
        severity: 'CRITICAL',
        scoreImpact: 55,
        title: 'Exact Duplicate Invoice Detected',
        description: `This invoice has the same vendor ("${current.vendor}") and invoice ID ("${current.invoice_id}") as ${exactMatches.length} other record(s).`,
        evidence: [
          `Vendor: "${current.vendor}" matches identical normalized name.`,
          `Invoice ID: "${current.invoice_id}" is identical.`,
          `Conflicting Record(s): ${exactMatches.map(m => `#${m.invoice_id} ($${m.amount.toFixed(2)}, dated ${m.invoice_date})`).join(', ')}.`,
          `Deterministic Verification: Deterministic match on composite key [vendor + invoice_id].`,
        ],
        relatedInvoiceIds: matchIds,
      });
    }

    // ----------------------------------------------------
    // RULE B: Potential Near Duplicate Detection
    // ----------------------------------------------------
    // Only evaluate if not already an exact duplicate
    if (exactMatches.length === 0) {
      const nearMatches: { invoice: Invoice; reasons: string[]; similarity: number }[] = [];

      for (let j = 0; j < invoices.length; j++) {
        if (i === j) continue;
        const other = invoices[j];
        const otherNormVendor = normalizeVendorName(other.vendor);
        if (normVendor !== otherNormVendor) continue;

        const dayDiff = daysBetween(current.invoice_date, other.invoice_date);
        const sim = stringSimilarity(current.invoice_id, other.invoice_id);
        const amountDiff = Math.abs(current.amount - other.amount);
        const isSameAmount = amountDiff < 0.01;
        const isCloseAmount = amountDiff <= current.amount * 0.03; // within 3%

        // Detect if IDs are merely sequential counters (e.g. 101 vs 102) across different billing cycles
        const isSequentialCounter = 
          dayDiff !== null && dayDiff >= 20 && 
          /\d+$/.test(current.invoice_id) && /\d+$/.test(other.invoice_id);

        const reasons: string[] = [];

        // Condition 1: Same vendor, exact same amount, billed unusually close (< 14 days apart)
        // Standard recurring subscriptions are spaced ~30 or ~90 days; < 14 days is a potential duplicate risk.
        if (dayDiff !== null && dayDiff <= 14 && isSameAmount) {
          reasons.push(
            `Identical amount ($${current.amount.toFixed(2)}) billed only ${dayDiff} day(s) apart from #${other.invoice_id}`
          );
        }

        // Condition 2: Revision / Suffix variation (e.g., APX-8102 vs APX-8102-B or INV-100-REV)
        // with close date (< 21 days) or same amount
        const hasRevisionSuffix = 
          (current.invoice_id.includes(other.invoice_id) || other.invoice_id.includes(current.invoice_id)) &&
          current.invoice_id !== other.invoice_id;

        if (hasRevisionSuffix && (isSameAmount || isCloseAmount)) {
          reasons.push(
            `Likely re-issued revision code (${current.invoice_id} vs ${other.invoice_id}) with matching amount`
          );
        } else if (sim >= 0.85 && !isSequentialCounter && isSameAmount && dayDiff !== null && dayDiff <= 20) {
          reasons.push(
            `High invoice number similarity (${(sim * 100).toFixed(0)}%) with identical amount within ${dayDiff} day(s)`
          );
        }

        if (reasons.length > 0) {
          nearMatches.push({ invoice: other, reasons, similarity: sim });
        }
      }

      if (nearMatches.length > 0) {
        const relatedIds = nearMatches.map(m => m.invoice.invoice_id);
        const evidenceDetails = nearMatches.flatMap(m => [
          `Candidate record #${m.invoice.invoice_id} ($${m.invoice.amount.toFixed(2)}, dated ${m.invoice.invoice_date})`,
          ...m.reasons,
        ]);

        findings.push({
          id: `finding-near-dup-${current.id}`,
          category: 'POTENTIAL_DUPLICATE',
          severity: 'HIGH',
          scoreImpact: 35,
          title: 'Potential Near-Duplicate Invoice',
          description: `Signals indicate possible double-billing or re-issued billing for vendor "${current.vendor}".`,
          evidence: [
            `Vendor: "${current.vendor}" matches historical billing records.`,
            ...evidenceDetails,
            `Note: Distinguished as a potential match pending human review, not a confirmed record collision.`,
          ],
          relatedInvoiceIds: relatedIds,
        });
      }
    }

    // ----------------------------------------------------
    // RULE C: Amount Mismatch Against Reference (PO / Expected)
    // ----------------------------------------------------
    // Strictly ONLY if expected_amount exists
    if (current.expected_amount !== undefined && current.expected_amount !== null) {
      const diff = current.amount - current.expected_amount;
      const absDiff = Math.abs(diff);

      // Any difference greater than 1 cent
      if (absDiff > 0.01) {
        const percentChange = ((diff) / current.expected_amount) * 100;
        const isOverbilled = diff > 0;
        const severity: RiskLevel = Math.abs(percentChange) > 20 || absDiff > 500 ? 'HIGH' : 'MEDIUM';
        const impact = isOverbilled ? (percentChange > 25 ? 35 : 20) : 15;

        findings.push({
          id: `finding-po-mismatch-${current.id}`,
          category: 'AMOUNT_MISMATCH',
          severity,
          scoreImpact: impact,
          title: isOverbilled ? 'Billed Amount Exceeds Approved PO' : 'Billed Amount Discrepancy with Reference',
          description: `Billed amount ($${current.amount.toFixed(2)}) does not match expected amount ($${current.expected_amount.toFixed(2)})${current.po_number ? ` for PO #${current.po_number}` : ''}.`,
          evidence: [
            `Billed Amount: $${current.amount.toFixed(2)}`,
            `Expected / Authorized Amount: $${current.expected_amount.toFixed(2)}`,
            `Variance: ${diff >= 0 ? '+' : ''}$${diff.toFixed(2)} (${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%)`,
            current.po_number ? `Purchase Order Reference: ${current.po_number}` : `Reference: Baseline contracted amount`,
          ],
          fieldAffected: 'amount',
        });
      }
    }

    // ----------------------------------------------------
    // RULE D: Amount Outliers (Robust MAD Baseline)
    // ----------------------------------------------------
    const baseline = vendorBaselines.get(normVendor);
    if (baseline && baseline.count >= config.minimumOutlierBaseline) {
      const median = baseline.median;
      const mad = baseline.mad;

      // Only compute outlier if MAD > 0 or use IQR fallback
      if (mad > 0) {
        // Modified Z-Score: 0.6745 * |x - median| / MAD
        const modifiedZScore = (0.6745 * Math.abs(current.amount - median)) / mad;

        if (modifiedZScore >= config.outlierZScoreThreshold && current.amount > median) {
          const ratio = (current.amount / (median || 1)).toFixed(1);
          findings.push({
            id: `finding-outlier-${current.id}`,
            category: 'AMOUNT_OUTLIER',
            severity: modifiedZScore > 4.0 ? 'HIGH' : 'MEDIUM',
            scoreImpact: modifiedZScore > 4.0 ? 35 : 20,
            title: 'Unusually High Invoice Amount',
            description: `The billed amount ($${current.amount.toFixed(2)}) is an outlier compared to vendor "${current.vendor}" historical baseline.`,
            evidence: [
              `Billed Amount: $${current.amount.toFixed(2)}`,
              `Vendor Historical Median: $${median.toFixed(2)} (Sample size n=${baseline.count})`,
              `Median Absolute Deviation (MAD): $${mad.toFixed(2)}`,
              `Modified Z-Score: ${modifiedZScore.toFixed(2)} (Threshold: ${config.outlierZScoreThreshold})`,
              `Multiplier: Approximately ${ratio}x higher than vendor standard spend.`,
            ],
            fieldAffected: 'amount',
          });
        }
      } else if (median > 0 && current.amount > median * 3 && current.amount > 1000) {
        // Flat baseline where MAD is 0 (all previous identical) but current is much higher
        findings.push({
          id: `finding-outlier-flat-${current.id}`,
          category: 'AMOUNT_OUTLIER',
          severity: 'HIGH',
          scoreImpact: 30,
          title: 'Abnormal Jump Over Baseline Spend',
          description: `Invoice amount is more than 3x the consistent historical baseline for vendor "${current.vendor}".`,
          evidence: [
            `Billed Amount: $${current.amount.toFixed(2)}`,
            `Historical Baseline: $${median.toFixed(2)} (n=${baseline.count})`,
            `Consistent spend was previously invariant; this represents an unexpected surge.`,
          ],
          fieldAffected: 'amount',
        });
      }
    }

    // ----------------------------------------------------
    // RULE E: Invalid or Future Invoice Dates
    // ----------------------------------------------------
    if (current.invoice_date) {
      const invTimestamp = new Date(current.invoice_date + 'T00:00:00Z').getTime();
      if (!isNaN(invTimestamp)) {
        if (invTimestamp > refTimestamp) {
          const daysInFuture = Math.ceil((invTimestamp - refTimestamp) / (1000 * 60 * 60 * 24));
          findings.push({
            id: `finding-future-date-${current.id}`,
            category: 'FUTURE_DATE',
            severity: 'MEDIUM',
            scoreImpact: 25,
            title: 'Future Invoice Date Detected',
            description: `Invoice date (${current.invoice_date}) is post-dated by ${daysInFuture} day(s) ahead of audit reference date (${refDateStr}).`,
            evidence: [
              `Invoice Date: ${current.invoice_date}`,
              `Audit Reference Date: ${refDateStr}`,
              `Time Offset: +${daysInFuture} days in future`,
              `Financial Risk: Premature billing or erroneous period-end accounting recognition.`,
            ],
            fieldAffected: 'invoice_date',
          });
        }
      } else {
        findings.push({
          id: `finding-invalid-date-${current.id}`,
          category: 'DATA_QUALITY',
          severity: 'LOW',
          scoreImpact: 10,
          isDataQualityOnly: true,
          title: 'Unparseable Invoice Date',
          description: `The date format provided could not be verified according to ISO standards.`,
          evidence: [`Raw Date string: "${current.invoice_date}"`],
          fieldAffected: 'invoice_date',
        });
      }
    } else {
      findings.push({
        id: `finding-missing-date-${current.id}`,
        category: 'DATA_QUALITY',
        severity: 'LOW',
        scoreImpact: 10,
        isDataQualityOnly: true,
        title: 'Missing Invoice Date',
        description: `Invoice lacks a valid issue date.`,
        evidence: ['No invoice date field provided in billing record.'],
        fieldAffected: 'invoice_date',
      });
    }

    // ----------------------------------------------------
    // RULE F: Missing Important Fields / Data Quality
    // ----------------------------------------------------
    if (!current.vendor || current.vendor === 'UNKNOWN VENDOR') {
      findings.push({
        id: `finding-missing-vendor-${current.id}`,
        category: 'DATA_QUALITY',
        severity: 'LOW',
        scoreImpact: 15,
        isDataQualityOnly: true,
        title: 'Missing Vendor Identification',
        description: 'Biller name is absent from invoice record. Requires vendor resolution before disbursement.',
        evidence: ['Vendor name is empty or marked UNKNOWN.'],
        fieldAffected: 'vendor',
      });
    }

    // Tally category counts and calculate risk score
    let totalScore = 0;
    findings.forEach(f => {
      totalScore += f.scoreImpact;
      categoryBreakdown[f.category] = (categoryBreakdown[f.category] || 0) + 1;
      if (f.isDataQualityOnly) {
        dataQualityIssuesCount++;
      }
    });

    const overallScore = Math.min(100, totalScore);

    let riskLevel: RiskLevel = 'LOW';
    if (overallScore >= 75) {
      riskLevel = 'CRITICAL';
    } else if (overallScore >= 45) {
      riskLevel = 'HIGH';
    } else if (overallScore >= 20) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    const isFlagged = findings.length > 0;
    if (isFlagged) {
      flaggedCount++;
      flaggedAmount += current.amount;
    }
    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
      highRiskCount++;
    }

    analyses.push({
      invoice: current,
      overallScore,
      riskLevel,
      findings,
      flagged: isFlagged,
      reviewStatus: 'PENDING',
    });
  }

  const durationMs = Math.round(performance.now() - startTime);

  const metrics: BatchAuditMetrics = {
    totalInvoices: invoices.length,
    totalAnalyzedValue: Math.round(totalAnalyzedValue * 100) / 100,
    flaggedCount,
    highRiskCount,
    flaggedAmount: Math.round(flaggedAmount * 100) / 100,
    riskDistribution: {
      low: analyses.filter(a => a.riskLevel === 'LOW').length,
      medium: analyses.filter(a => a.riskLevel === 'MEDIUM').length,
      high: analyses.filter(a => a.riskLevel === 'HIGH').length,
      critical: analyses.filter(a => a.riskLevel === 'CRITICAL').length,
    },
    categoryBreakdown,
    dataQualityIssuesCount,
    auditRunAt: new Date().toISOString(),
    executionDurationMs: durationMs,
  };

  return { analyses, metrics };
}

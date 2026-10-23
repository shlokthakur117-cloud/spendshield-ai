import { parseInvoiceCsv } from '../src/lib/parser';
import { runAuditDetection } from '../src/lib/engine';
import { explainInvoiceWithGemini } from '../src/lib/gemini';
import {
  SYNTHETIC_INVOICES,
  GROUND_TRUTH_LABELS,
  generateSyntheticCsvString,
  generateEnterpriseWorkload,
} from '../src/data/synthetic-invoices';
import { sanitizeCsvCell, validateExplainPayload } from '../src/lib/security';
import { Invoice } from '../src/types/invoice';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function recordTest(id: number, name: string, passed: boolean, details: string) {
  results.push({ id, name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [Test ${id}]: ${name} -> ${details}`);
}

async function runTestSuite() {
  console.log('===========================================================');
  console.log('  SpendShield AI — Full Verification & Security Audit      ');
  console.log('===========================================================\n');

  // Reference audit date: 2026-10-23
  const refDate = '2026-10-23';

  // ----------------------------------------------------
  // TEST 1: Exact Duplicate Detection
  // ----------------------------------------------------
  try {
    const invoices: Invoice[] = [
      { id: '1', invoice_id: 'INV-100', vendor: 'Acme Corp', invoice_date: '2026-05-01', amount: 500, currency: 'USD' },
      { id: '2', invoice_id: 'INV-100', vendor: 'Acme Corp', invoice_date: '2026-05-05', amount: 500, currency: 'USD' },
    ];
    const { analyses } = runAuditDetection(invoices, { referenceDate: refDate });
    const exactDupFound = analyses.every(a => a.findings.some(f => f.category === 'EXACT_DUPLICATE'));
    recordTest(1, 'Exact duplicate detection', exactDupFound, `Found EXACT_DUPLICATE in both records: ${exactDupFound}`);
  } catch (err) {
    recordTest(1, 'Exact duplicate detection', false, String(err));
  }

  // ----------------------------------------------------
  // TEST 2: Potential Duplicate Detection
  // ----------------------------------------------------
  try {
    const invoices: Invoice[] = [
      { id: '1', invoice_id: 'APX-501', vendor: 'Apex Supplies', invoice_date: '2026-05-01', amount: 750, currency: 'USD' },
      { id: '2', invoice_id: 'APX-501-A', vendor: 'Apex Supplies', invoice_date: '2026-05-08', amount: 750, currency: 'USD' },
    ];
    const { analyses } = runAuditDetection(invoices, { referenceDate: refDate });
    const nearDupFound = analyses.some(a => a.findings.some(f => f.category === 'POTENTIAL_DUPLICATE'));
    recordTest(2, 'Potential duplicate detection', nearDupFound, `Detected near-duplicate candidate: ${nearDupFound}`);
  } catch (err) {
    recordTest(2, 'Potential duplicate detection', false, String(err));
  }

  // ----------------------------------------------------
  // TEST 3: Normal Invoice (Clean baseline)
  // ----------------------------------------------------
  try {
    const invoices: Invoice[] = [
      { id: '1', invoice_id: 'CLEAN-01', vendor: 'Google Workspace', invoice_date: '2026-04-10', amount: 120, expected_amount: 120, po_number: 'PO-GW-1', currency: 'USD' },
      { id: '2', invoice_id: 'CLEAN-02', vendor: 'Slack Technologies', invoice_date: '2026-04-12', amount: 250, expected_amount: 250, po_number: 'PO-SL-1', currency: 'USD' },
    ];
    const { analyses } = runAuditDetection(invoices, { referenceDate: refDate });
    const allClean = analyses.every(a => a.riskLevel === 'LOW' && a.findings.length === 0);
    recordTest(3, 'Normal invoice handling', allClean, `All clean records classified as LOW risk: ${allClean}`);
  } catch (err) {
    recordTest(3, 'Normal invoice handling', false, String(err));
  }

  // ----------------------------------------------------
  // TEST 4: Large Unusual Amount (Outlier detection)
  // ----------------------------------------------------
  try {
    // 6 baseline invoices for vendor + 1 massive outlier
    const invoices: Invoice[] = [
      { id: '1', invoice_id: 'AWS-1', vendor: 'AWS Cloud', invoice_date: '2026-01-01', amount: 1000, currency: 'USD' },
      { id: '2', invoice_id: 'AWS-2', vendor: 'AWS Cloud', invoice_date: '2026-02-01', amount: 1050, currency: 'USD' },
      { id: '3', invoice_id: 'AWS-3', vendor: 'AWS Cloud', invoice_date: '2026-03-01', amount: 980, currency: 'USD' },
      { id: '4', invoice_id: 'AWS-4', vendor: 'AWS Cloud', invoice_date: '2026-04-01', amount: 1020, currency: 'USD' },
      { id: '5', invoice_id: 'AWS-5', vendor: 'AWS Cloud', invoice_date: '2026-05-01', amount: 1010, currency: 'USD' },
      { id: '6', invoice_id: 'AWS-6', vendor: 'AWS Cloud', invoice_date: '2026-06-01', amount: 1030, currency: 'USD' },
      { id: '7', invoice_id: 'AWS-OUTLIER', vendor: 'AWS Cloud', invoice_date: '2026-07-01', amount: 25000, currency: 'USD' },
    ];
    const { analyses } = runAuditDetection(invoices, { referenceDate: refDate });
    const outlierItem = analyses.find(a => a.invoice.invoice_id === 'AWS-OUTLIER');
    const hasOutlierFinding = outlierItem?.findings.some(f => f.category === 'AMOUNT_OUTLIER');
    recordTest(4, 'Large unusual amount outlier detection', Boolean(hasOutlierFinding), `Outlier flagged with MAD baseline: ${hasOutlierFinding}`);
  } catch (err) {
    recordTest(4, 'Large unusual amount outlier detection', false, String(err));
  }

  // ----------------------------------------------------
  // TEST 5: Amount Mismatch with Reference Value
  // ----------------------------------------------------
  try {
    const invoices: Invoice[] = [
      { id: '1', invoice_id: 'PO-TEST-01', vendor: 'Logitech', invoice_date: '2026-05-10', amount: 1500, expected_amount: 1000, po_number: 'PO-551', currency: 'USD' },
    ];
    const { analyses } = runAuditDetection(invoices, { referenceDate: refDate });
    const mismatchFound = analyses[0]?.findings.some(f => f.category === 'AMOUNT_MISMATCH');
    recordTest(5, 'Amount mismatch with reference PO value', Boolean(mismatchFound), `Mismatch flagged when billed > expected: ${mismatchFound}`);
  } catch (err) {
    recordTest(5, 'Amount mismatch with reference PO value', false, String(err));
  }

  // ----------------------------------------------------
  // TEST 6: No Reference Value (Must NOT invent mismatch)
  // ----------------------------------------------------
  try {
    const invoices: Invoice[] = [
      { id: '1', invoice_id: 'NO-REF-01', vendor: 'Hardware Depot', invoice_date: '2026-05-10', amount: 1500, currency: 'USD' },
    ];
    const { analyses } = runAuditDetection(invoices, { referenceDate: refDate });
    const hasMismatch = analyses[0]?.findings.some(f => f.category === 'AMOUNT_MISMATCH');
    recordTest(6, 'No reference value (must not invent mismatch)', !hasMismatch, `Safely omitted mismatch when reference field absent: ${!hasMismatch}`);
  } catch (err) {
    recordTest(6, 'No reference value (must not invent mismatch)', false, String(err));
  }

  // ----------------------------------------------------
  // TEST 7: Future Date Detection
  // ----------------------------------------------------
  try {
    const invoices: Invoice[] = [
      { id: '1', invoice_id: 'FUT-01', vendor: 'Future Corp', invoice_date: '2026-12-25', amount: 800, currency: 'USD' },
    ];
    const { analyses } = runAuditDetection(invoices, { referenceDate: refDate });
    const futureFlag = analyses[0]?.findings.some(f => f.category === 'FUTURE_DATE');
    recordTest(7, 'Future date detection', Boolean(futureFlag), `Detected future invoice dated 2026-12-25: ${futureFlag}`);
  } catch (err) {
    recordTest(7, 'Future date detection', false, String(err));
  }

  // ----------------------------------------------------
  // TEST 8: Invalid CSV Handling
  // ----------------------------------------------------
  try {
    const invalidCsv = 'invalid_column_1,invalid_column_2\nfoo,bar';
    const parseRes = parseInvoiceCsv(invalidCsv);
    const hasErrors = parseRes.errors.length > 0 && parseRes.invoices.length === 0;
    recordTest(8, 'Invalid CSV rejection', hasErrors, `Safely rejected missing columns: ${parseRes.errors[0]}`);
  } catch (err) {
    recordTest(8, 'Invalid CSV rejection', false, String(err));
  }

  // ----------------------------------------------------
  // TEST 9: Missing Gemini API Key Graceful Fallback
  // ----------------------------------------------------
  try {
    const mockAnalysis = {
      invoice: { id: '1', invoice_id: 'INV-TEST', vendor: 'Test Vendor', invoice_date: '2026-05-01', amount: 500, currency: 'USD' },
      overallScore: 55,
      riskLevel: 'HIGH' as const,
      findings: [{
        id: 'f1',
        category: 'POTENTIAL_DUPLICATE' as const,
        severity: 'HIGH' as const,
        scoreImpact: 35,
        title: 'Potential Near-Duplicate',
        description: 'Possible duplicate billing',
        evidence: ['Identical amounts billed within 5 days'],
      }],
      flagged: true,
      reviewStatus: 'PENDING' as const,
    };
    const explanation = await explainInvoiceWithGemini(mockAnalysis, '');
    const isFallbackWorking = explanation.summary.includes('fallback mode') && explanation.evidence.length > 0;
    recordTest(9, 'Missing Gemini API key graceful fallback', isFallbackWorking, `Fallback explanation produced without crash: ${isFallbackWorking}`);
  } catch (err) {
    recordTest(9, 'Missing Gemini API key graceful fallback', false, String(err));
  }

  // ----------------------------------------------------
  // TEST 10: Empty and Malformed Inputs
  // ----------------------------------------------------
  try {
    const emptyRes = parseInvoiceCsv('');
    const corruptCsv = 'invoice_id,vendor,invoice_date,amount\n,,,\nINV-01,Acme,corrupt-date,NOT_A_NUMBER';
    const corruptRes = parseInvoiceCsv(corruptCsv);
    const passes = emptyRes.errors.length > 0 && corruptRes.warnings.length > 0 && corruptRes.invoices.length === 0;
    recordTest(10, 'Empty and malformed inputs', passes, `Handled empty string & malformed numerical fields gracefully`);
  } catch (err) {
    recordTest(10, 'Empty and malformed inputs', false, String(err));
  }

  // ----------------------------------------------------
  // TEST 11: Security — CSV Formula Injection Neutralization
  // ----------------------------------------------------
  try {
    const maliciousPayload = '=cmd|"/c calc"!A0';
    const sanitized = sanitizeCsvCell(maliciousPayload);
    // Verified that the cell is prefixed with ' to force Excel/Sheets to treat as text
    const passes = sanitized.startsWith("'=") || sanitized.startsWith('"\'=') || sanitized.includes("'=");
    recordTest(11, 'CSV formula injection neutralization (CWE-1236)', passes, `Neutralized command prefix: ${sanitized}`);
  } catch (err) {
    recordTest(11, 'CSV formula injection neutralization (CWE-1236)', false, String(err));
  }

  // ----------------------------------------------------
  // SYNTHETIC GROUND-TRUTH BENCHMARK EVALUATION (45 Invoices)
  // ----------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  Benchmark 1: Synthetic Ground-Truth Dataset (45 Invoices) ');
  console.log('-----------------------------------------------------------');

  const csvContent = generateSyntheticCsvString();
  const parsed = parseInvoiceCsv(csvContent);
  const startTime = performance.now();
  const { analyses, metrics } = runAuditDetection(parsed.invoices, { referenceDate: refDate });
  const execDuration = (performance.now() - startTime).toFixed(2);

  const labelMap = new Map(GROUND_TRUTH_LABELS.map(l => [l.invoice_id, l]));

  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;

  analyses.forEach(analysis => {
    const groundTruth = labelMap.get(analysis.invoice.invoice_id);
    const isActualAnomaly = groundTruth?.isAnomaly ?? false;
    const isPredictedAnomaly = analysis.flagged && (analysis.riskLevel === 'HIGH' || analysis.riskLevel === 'CRITICAL' || analysis.findings.length > 0);

    if (isActualAnomaly && isPredictedAnomaly) {
      tp++;
    } else if (!isActualAnomaly && isPredictedAnomaly) {
      fp++;
    } else if (isActualAnomaly && !isPredictedAnomaly) {
      fn++;
    } else {
      tn++;
    }
  });

  const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  console.log(`Dataset Size:         ${analyses.length} synthetic invoices`);
  console.log(`Execution Duration:   ${execDuration} ms`);
  console.log(`True Positives (TP):  ${tp}`);
  console.log(`False Positives (FP): ${fp}`);
  console.log(`False Negatives (FN): ${fn}`);
  console.log(`True Negatives (TN):  ${tn}`);
  console.log(`Precision:            ${(precision * 100).toFixed(1)}%`);
  console.log(`Recall:               ${(recall * 100).toFixed(1)}%`);
  console.log(`F1 Score:             ${(f1 * 100).toFixed(1)}%`);

  // ----------------------------------------------------
  // BENCHMARK 2: Enterprise Workload Scalability (1,000 Invoices)
  // ----------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  Benchmark 2: Enterprise Scalability Workload (1,000 Invoices) ');
  console.log('-----------------------------------------------------------');

  const enterpriseWorkload = generateEnterpriseWorkload(1000);
  const start1000 = performance.now();
  const res1000 = runAuditDetection(enterpriseWorkload, { referenceDate: refDate });
  const duration1000 = (performance.now() - start1000).toFixed(2);

  console.log(`Dataset Size:         ${res1000.analyses.length} enterprise invoices`);
  console.log(`Execution Duration:   ${duration1000} ms`);
  console.log(`Throughput Rate:      ${Math.round((1000 / parseFloat(duration1000)) * 1000).toLocaleString()} invoices / second`);
  console.log(`Total Value Audited:  $${res1000.metrics.totalAnalyzedValue.toLocaleString()}`);
  console.log(`Flagged Invoices:     ${res1000.metrics.flaggedCount}`);
  console.log(`High/Critical Risk:   ${res1000.metrics.highRiskCount}`);

  const allPassed = results.every(r => r.passed);
  console.log('\n===========================================================');
  console.log(`Test Summary: ${results.filter(r => r.passed).length}/${results.length} PASSED`);
  console.log('===========================================================');

  if (!allPassed) {
    process.exit(1);
  }
}

runTestSuite();

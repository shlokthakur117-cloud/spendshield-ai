/**
 * Security & Input Sanitization Utilities for SpendShield AI
 */

import { InvoiceAnalysis } from '@/types/invoice';

/**
 * Neutralizes CSV / Spreadsheet Formula Injection (CWE-1236: Improper Neutralization of Formula Elements)
 * If a cell begins with '=', '+', '-', '@', '\t', or '\r', it could be executed as a dynamic formula
 * in Microsoft Excel, LibreOffice Calc, or Google Sheets upon export.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (str === '') return '';

  // Dangerous spreadsheet formula triggers
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  let safeStr = str;

  // If the cell starts with a formula trigger (and is not a valid negative number)
  if (dangerousPrefixes.some(prefix => safeStr.startsWith(prefix))) {
    // If it's a legitimate negative number like "-120.50", allow if pure number
    if (safeStr.startsWith('-') && /^-?\d+(\.\d+)?$/.test(safeStr)) {
      return safeStr;
    }
    // Prefix with single quote to force spreadsheet programs to treat as inert text
    safeStr = `'${safeStr}`;
  }

  // Escape internal double quotes for CSV RFC 4180 compliance
  if (safeStr.includes(',') || safeStr.includes('"') || safeStr.includes('\n') || safeStr.includes(';')) {
    return `"${safeStr.replace(/"/g, '""')}"`;
  }

  return safeStr;
}

/**
 * Validates incoming POST /api/explain request payload to prevent
 * oversized payloads, prototype pollution, or abusive Gemini AI requests.
 */
export function validateExplainPayload(body: unknown): {
  valid: boolean;
  error?: string;
  sanitizedAnalysis?: InvoiceAnalysis;
} {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Expected a JSON object.' };
  }
  const payload = body as Record<string, unknown>;
  const analysis = payload.analysis;
  if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) {
    return { valid: false, error: 'Missing analysis object.' };
  }
  const a = analysis as Record<string, unknown>;
  const invoice = a.invoice;
  if (!invoice || typeof invoice !== 'object' || Array.isArray(invoice)) {
    return { valid: false, error: 'Missing invoice object.' };
  }
  const inv = invoice as Record<string, unknown>;
  const validText = (v: unknown, max: number) =>
    typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  if (!validText(inv.invoice_id, 100) || !validText(inv.vendor, 200) ||
      !validText(inv.invoice_date, 30) || !validText(inv.currency, 3) ||
      !Number.isFinite(inv.amount) || (inv.amount as number) < 0) {
    return { valid: false, error: 'Invalid invoice fields.' };
  }
  if (!Number.isFinite(a.overallScore) || (a.overallScore as number) < 0 ||
      (a.overallScore as number) > 100 ||
      !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(String(a.riskLevel))) {
    return { valid: false, error: 'Invalid risk assessment.' };
  }
  if (!Array.isArray(a.findings) || a.findings.length > 25) {
    return { valid: false, error: 'Invalid findings array.' };
  }
  const allowedCategories = new Set([
    'EXACT_DUPLICATE', 'POTENTIAL_DUPLICATE', 'AMOUNT_MISMATCH',
    'AMOUNT_OUTLIER', 'FUTURE_DATE', 'DATA_QUALITY',
  ]);
  for (const finding of a.findings) {
    if (!finding || typeof finding !== 'object' || Array.isArray(finding)) {
      return { valid: false, error: 'Malformed finding.' };
    }
    const f = finding as Record<string, unknown>;
    if (!allowedCategories.has(String(f.category)) ||
        !validText(f.title, 200) || !validText(f.description, 1500) ||
        !Array.isArray(f.evidence) || f.evidence.length > 15 ||
        !f.evidence.every((e: unknown) => typeof e === 'string' && e.length <= 500)) {
      return { valid: false, error: 'Invalid finding evidence.' };
    }
  }
  return { valid: true, sanitizedAnalysis: a as unknown as InvoiceAnalysis };
}
